const poetry = require('./blackoutPoetry');
const socket = io();
const access_token = Cookies.get('access_token');
const channel = Cookies.get('channelNum');

let refresh_token = Cookies.get('refresh_token');


const refreshToken = () => {
  $.ajax({
    url: '/refresh_token',
    data: {
      refresh_token: refresh_token,
    },
  })
    .done(function (data) {
      access_token = data.access_token;
      Cookies.set('access_token', access_token);
    })
    .fail(function (xhr, status, error) {
      //Ajax request failed.
      var errorMessage = xhr.status + ': ' + xhr.statusText;
      alert('Error - ' + errorMessage);
    });
}

//client socket stuff - joining channels, triggers for spotify api requests etc.

const transferPlayback = () => {
  $.ajax({
    url: 'https://api.spotify.com/v1/me/player',
    headers: {
      Authorization: 'Bearer ' + access_token,
    },
    contentType: 'application/json',
    type: 'PUT',
    data: JSON.stringify({ device_ids: [userdeviceID] }),
  }).done(function (response) {

  });
}

const getBroadcastPlayback = channelNum => {
  $.ajax({
    url: 'https://api.spotify.com/v1/me/player',
    headers: {
      Authorization: 'Bearer ' + access_token,
    },
    success: function (response) {
      console.log(response);

      playbackJson = {
        imgsrc: response.item.album.images[0].url,
        songName: response.item.name,
        artistName: response.item.artists[0].name,
        albumName: response.item.album.name,
        progress: response.progress_ms,
        songLength: response.timestamp,
        isPlaying: response.is_playing,
        uri: response.item.uri,
        deviceID: response.device.id,
        trackID: response.item.id,
        channel: channelNum,
      };

      socket.emit('BroadcasterPlayback', playbackJson);
    },
  });
}

setTimeout(refreshToken, 1000000);
setInterval(getBroadcastPlayback, 250, channel);

$(document).ajaxError(function (event, jqxhr, settings, exception) {
  if (jqxhr.status == 401) {
    refreshToken();
  }
});
