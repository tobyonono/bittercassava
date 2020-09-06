const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const request = require('request');
const cors = require('cors');
const querystring = require('querystring');
const app = express();
const dotenv = require('dotenv');
const server = require('http').Server(app);
const io = require('socket.io')(server, {});
dotenv.config({path: __dirname + '/.env'});

// Spotify Credentials
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;


// Verify that environment variables are set
if (
  !process.env.CLIENT_ID ||
  !process.env.CLIENT_SECRET ||
  process.env.CLIENT_ID === 'XXX' ||
  process.env.CLIENT_SECRET === 'XXX'
) {
  console.error('ERROR');
  console.error('You need to add a Spotify client ID and secret in your .env file!');
  return;
}

// Express Server Setup
const PORT = process.env.PORT || 4000;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app
  .use(express.static(path.join(__dirname, '/public')))
  .use(cors())
  .use(cookieParser());

const generateRandomString = function (length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const stateKey = 'spotify_auth_state';

// API Endpoints
app.get('/', function (req, res) {
  res.render('index.html');
});

app.get('/login', function (req, res) {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  // Authorise with Spotify
  const scope =
    'user-read-private user-read-email user-read-currently-playing user-read-playback-state user-library-modify user-modify-playback-state ';
  res.redirect(
    'https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: scope,
        redirect_uri: REDIRECT_URI,
        state: state,
      }),
  );
});

app.get('/home', function (req, res) {
  res.sendFile(__dirname + '/public/app.html');
});

app.get('/broadcaster', function (req, res) {
  res.sendFile(__dirname + '/public/broadcaster.html');
});

app.get('/postTokens', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.json(req.tokens);
});

app.get('/callback', function (req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter

  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(
      '/#' +
        querystring.stringify({
          error: 'state_mismatch',
        }),
    );
  } else {
    res.clearCookie(stateKey);
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      },
      headers: {
        Authorization: 'Basic ' + new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
      },
      json: true,
    };

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        let isBroadcaster = false;
        let query = querystring.stringify({
          isBroadcaster: false,
        });
        const access_token = body.access_token,
          refresh_token = body.refresh_token;

        res.cookie('refresh_token', refresh_token, {
          maxAge: 30 * 24 * 3600 * 1000,
        });

        res.cookie('access_token', access_token, {
          maxAge: 30 * 24 * 3600 * 1000,
        });

        const options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { Authorization: 'Bearer ' + access_token },
          json: true,
        };

        request.get(options, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            if (body.id === '96pcj22qe7b6uom5ifeia72vb' || body.id === '1158091471') {
              res.redirect('/broadcaster');
            } else {
              res.redirect('/home');
            }
          }
        });

        // use the access token to access the Spotify Web API

        // we can also pass the token to the browser to make requests from there
        /*
        res.redirect('/home/' + querystring.stringify({
          "isBroadcaster": isBroadcaster
      }));
      */
      } else {
        res.redirect(
          '/#' +
            querystring.stringify({
              error: 'invalid_token',
            }),
        );
      }
    });
  }
});

app.get('/refresh_token', function (req, res) {
  // requesting access token from refresh token
  const refresh_token = req.query.refresh_token;
  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      Authorization: 'Basic ' + new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'),
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      const access_token = body.access_token;
      res.send({
        access_token: access_token,
      });
    }
  });
});

/* socket stuff that handles the playback info from the broadcasting clients + publishes
   them to non broadcasters depending on what room they are in. Also handles joining + leaving rooms
   which are the channels on the frontend
*/

const playbackJson = { channel1: [], channel2: [] };
const latestInfo = { channel1: [], channel2: [] };

io.sockets.on('connection', function (socket) {
  socket.on('join', function (data) {
    socket.join(data);
    socket.emit('tapIn', latestInfo[data][0]);
  });

  socket.on('leave', function (data) {
    socket.emit('pauseSong');
    socket.leave(data);
    console.log(playbackJson);
  });

  socket.on('BroadcasterPlayback', function (data) {
    //need latestInfo for users who join mid song. playbackJson is for comparison to know when to trigger an api call for the user
    latestInfo[data.channel][0] = data;

    // This is a little messy! TODO: clean it up with some refactoring/comments
    if (playbackJson[data.channel].length === 0) {
      playbackJson[data.channel].push(data);
      console.log(playbackJson);
      if (playbackJson[data.channel][0].isPlaying == true) {
        socket.to(data.channel).emit('playSong', data);
      }
    } else if (playbackJson[data.channel][0].trackID !== data.trackID) {
      socket.to(data.channel).emit('playSong', data);
      playbackJson[data.channel][0] = data;
    } else if (playbackJson[data.channel][0].trackID === data.trackID) {
      if (data.isPlaying === true && playbackJson[data.channel][0].isPlaying === false) {
        socket.to(data.channel).emit('resumeSong', data);
        playbackJson[data.channel][0] = data;
      } else if (data.isPlaying === false && playbackJson[data.channel][0].isPlaying === true) {
        socket.to(data.channel).emit('pauseSong', data);
        playbackJson[data.channel][0] = data;
      }
    }
  });
});

console.log(`Starting server on port ${PORT}`);
server.listen(PORT);
