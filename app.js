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
const compression = require('compression');
const genius = require('genius-lyrics-api');
const cheerio = require('cheerio');
dotenv.config({ path: __dirname + '/.env' });

//helpers
const helper = require('./helperFuncs/helpers');

// Spotify Credentials
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

//broadcaster spotify ids

const BROADCASTER_ONE = process.env.BROADCASTER_ONE
const BROADCASTER_TWO = process.env.BROADCASTER_TWO




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
const REDIRECT_URI = process.env.REDIRECT_URI;

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app
  .use(express.static(path.join(__dirname, '/public')))
  .use(cors())
  .use(cookieParser())
  .use(compression());



const stateKey = 'spotify_auth_state';

// API Endpoints
app.get('/', function (req, res) {
  // stuff for immediate redirect in future
  const accountCheck = req.cookies[broadcaster] || null;
  res.render('index.html');

});

app.get('/login', function (req, res) {
  const state = helper.generateRandomString(16);

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
            if (body.id === BROADCASTER_ONE) {
              res.cookie('broadcaster', true, {
                maxAge: 30 * 24 * 3600 * 1000,
              });
              res.cookie('channelNum', 'channel1', {
                maxAge: 30 * 24 * 3600 * 1000,
              });
              res.redirect('/broadcaster');
            } else if (body.id === BROADCASTER_TWO) {
              res.cookie('broadcaster', true, {
                maxAge: 30 * 24 * 3600 * 1000,
              });
              res.cookie('channelNum', 'channel2', {
                maxAge: 30 * 24 * 3600 * 1000,
              });
              res.redirect('/broadcaster');
            }
            else {
              res.cookie('broadcaster', false, {
                maxAge: 30 * 24 * 3600 * 1000,
              });
              res.redirect('/home');
            }
          }
        });

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

app.post('/getLyrics', function (req, res) {
console.log("Inside getLyrics");
  const genOptions = {
    apiKey: process.env.GENIUS_ACCESS_TOKEN,
    title: req.body.song,
    artist: req.body.artist,
    optimizeQuery: true
  };

  genius.getLyrics(genOptions).then((lyrics) => res.json(lyrics.replace(/ *\[[^\]]*]/g, '')));
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

    // If statements to check state of broadcaster & user playback
    // 1st - Check if the playback array is empty, indicating user has just joined then play song and store song info for that channel
    if (playbackJson[data.channel].length === 0) {
      playbackJson[data.channel].push(data);
      console.log(playbackJson);
      if (playbackJson[data.channel][0].isPlaying == true) {
        socket.to(data.channel).emit('playSong', data);
      }
    }
    // 2nd - Compare the latest info received from socket with what is in the latestInfo array. If different, song has changed
    else if (playbackJson[data.channel][0].trackID !== data.trackID) {
      socket.to(data.channel).emit('queueSong', data);
      playbackJson[data.channel][0] = data;
      console.log("Queue Data..." + playbackJson[data.channel][0]);
    }
    // 3rd - Logic to decide whether song has paused/resumed and what action we need to take.
    else if (playbackJson[data.channel][0].trackID === data.trackID) {
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
