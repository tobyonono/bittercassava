var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var client_id = 'bacb63ddfb4448f2b7b47fc39dccbe1a'; // Your client id
var client_secret = '290f92b09a1f45b1b1fcd2ea691e7a79'; // Your secret
var redirect_uri = 'http://localhost:4000/callback'; // Your redirect uri

var app = express();
var clientSide = express();

var server = require("http").Server(app);
var io = require("socket.io")(server, {});
var shortid = require('shortid');
var broadcastingAccessToken;
var broadCastingRefreshToken;

var imgsrc;
var currentUserName;
var profiler;
var songName;
var artistName;
var albumName;
var progress;
var songLength;
var songURL;
var isPlaying;
var uri;
var deviceID;
var playbackArray = [];
var i = 0;
var playbackJson = {"playback":[]};

var jsonPushData = {
  userName: currentUserName,
  albumArt: imgsrc,
  songName: songName,
  artistName: artistName,
  albumName: albumName,
  songProgress: progress,
  songLength: songLength,
  songURL: songURL,
  isPlaying: isPlaying
};

// view engine setup


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '/public')))
   .use(cors())
   .use(cookieParser());


app.get('/', function(req, res) {
    res.render('index.html');
});

var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-read-currently-playing user-read-playback-state user-library-modify user-modify-playback-state ';
;
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/home', function(req, res) {
  res.sendFile(__dirname + "/public/app.html");
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API

        // we can also pass the token to the browser to make requests from there
        res.redirect('/home/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

app.get('/isBroadcastingUser', function(req, res)
{
  return( req.userID === '1158091471' ? true : false);
/**
  if (userID ==='1158091471')
  {
    var options = {
      url: 'https://api.spotify.com/v1/me/player',
      headers: { 'Authorization': 'Bearer ' + access_token },
      json: true
    };

    // use the access token to access the Spotify Web API
    request.get(options, function(error, response, body) {

    });
  }
  **/



});

/*
function refreshBroadcaster(refreshToken)
{
  var refToken = refreshToken;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refToken
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      broadcastingAccessToken = body.access_token;

    }
  });

  var options = {
    url: 'https://api.spotify.com/v1/me/player',
    headers: { 'Authorization': 'Bearer ' + broadcastingAccessToken },
    json: true
  };

  // use the access token to access the Spotify Web API
  request.get(options, function(error, response, body) {

    playbackJson = {
      imgsrc: body.item.album.images[0].url,
      songName: body.item.name,
      artistName: body.item.artists[0].name,
      albumName: body.item.album.name,
      progress: body.progress_ms,
      songLength: body.timestamp,
      isPlaying: body.is_playing,
      uri: body.item.uri,
      trackID: body.item.id
    }

    console.log(body);

  });
}
*/



//socket stuff to notify client there's a change in playbackInfo

io.sockets.on("connection", function(socket)
{
    var clientName = shortid.generate();
    console.log("client was connected, name = " + clientName);

    socket.on("getMyName", function()
    {
        socket.emit("onGetMyName", { name: clientName });
    });

    socket.on("sendMyNameToAllClients", function()
    {
        socket.broadcast.emit("onSendMyNameToAllClients", { name: clientName });
        console.log(clientName);
    });

    socket.on("BroadcasterPlayback", function(data)
    {
      if(playbackJson.playback.length === 0)
      {
        playbackJson.playback.push(data);
        if(playbackJson.playback[0].isPlaying == true)
        {
          socket.broadcast.emit("playSong", data);
        }
      }
      else if(playbackJson.playback[0].trackID !== data.trackID)
      {
        socket.broadcast.emit("playSong", data);
        playbackJson.playback[0] = data;
      }
      else if(playbackJson.playback[0].trackID === data.trackID)
      {
        if((data.isPlaying === true) && (playbackJson.playback[0].isPlaying === false))
        {
          socket.broadcast.emit("resumeSong", data);
          playbackJson.playback[0] = data;
        }
        else if((data.isPlaying === false) && (playbackJson.playback[0].isPlaying === true))
        {
          socket.broadcast.emit("pauseSong", data);
          playbackJson.playback[0] = data;
        }
      }
    });
});

const port = 4000;

server.listen(port, () => {
    console.log(`Server listening at ${port}`);
});
