import { generateBlackout } from './blackoutPoetry.js';
const socket = io();
let access_token = Cookies.get('access_token');

let refresh_token = Cookies.get('refresh_token');
let userdeviceID;


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
      console.log('Token Refresh');

      console.log(access_token);
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
    console.log('Playback successfully transferred');
  });
}

const joinChannel = channelNum => socket.emit('join', channelNum);
const leaveChannel = channelNum => socket.emit('leave', channelNum);


socket.on('tapIn', data => {
  //transferPlayback();
  console.log(data.uri + "tapIn....");
  $.ajax({
    url: 'https://api.spotify.com/v1/me/player/play',
    contentType: 'application/json',
    type: 'PUT',
    dataType: 'json',
    headers: {
      Authorization: 'Bearer ' + access_token,
    },
    data: JSON.stringify({
      uris: [data.uri],
      device_id: userdeviceID,
      position_ms: data.progress,
    }),
    success: function (response) {
      $('.recentlyPlayed').prepend(
        $('<li>', { class: 'header-list-item' }).append(
          $('<div/>', { class: 'histContainer' }).append(
            $('<div/>').append(
              $('<img/>', { src: data.imgsrc, alt: '', width: 48, height: 48 }),
            ),
            $('<div/>', { class: 'metadata', id: data.trackID }).append(
              $('<span/>', { class: 'artistName', text: data.artistName }),
              $('<span/>', { class: 'songName', text: data.songName }),
              $('<span/>', { class: 'albumName', text: data.albumName }),
            ),
            $('<div/>', { class: 'header-add-song-icon' }).append(
              $('<img/>', {
                class: 'addSong',
                id: data.trackID,
                src:
                  'https://images.vexels.com/media/users/3/139162/isolated/preview/8b23fcb6b6c68d0f290b8dc5b5252214-cross-or-plus-icon-by-vexels.png',
                alt: '',
                width: 18,
                height: 18,
              }),
            ),
          ),
        ),
        $('<hr>'),
      );
    },
  });
});
socket.on('playSong', data => {
  //transferPlayback();

  $.ajax({
    url: 'https://api.spotify.com/v1/me/player/play',
    contentType: 'application/json',
    type: 'PUT',
    dataType: 'json',
    headers: {
      Authorization: 'Bearer ' + access_token,
    },
    data: JSON.stringify({ uris: [data.uri], device_id: userdeviceID }),
    success: function (response) {
      $('.recentlyPlayed').prepend(
        $('<li>', { class: 'header-list-item' }).append(
          $('<div/>', { class: 'histContainer' }).append(
            $('<div/>').append(
              $('<img/>', { src: data.imgsrc, alt: '', width: 48, height: 48 }),
            ),
            $('<div/>', { class: 'metadata', id: data.trackID }).append(
              $('<span/>', { class: 'artistName', text: data.artistName }),
              $('<span/>', { class: 'songName', text: data.songName }),
              $('<span/>', { class: 'albumName', text: data.albumName }),
            ),
            $('<div/>', { class: 'header-add-song-icon' }).append(
              $('<img/>', {
                class: 'addSong',
                id: data.trackID,
                src:
                  'https://images.vexels.com/media/users/3/139162/isolated/preview/8b23fcb6b6c68d0f290b8dc5b5252214-cross-or-plus-icon-by-vexels.png',
                alt: '',
                width: 18,
                height: 18,
              }),
            ),
          ),
        ),
        $('<hr>'),
      );
    },
  });

  $.ajax({
    url: '/getLyrics',
    method:'POST',
    dataType: 'json',
    contentType: "application/json",
    data: JSON.stringify({ artist: data.artistName, song: data.songName }),

    success: function(response) {
      generateBlackout(response, data.artistName, data.songName);
      console.log(response);
      console.log(response.split(/\r\n|\r|\n/));
    }
  });
});

socket.on('pauseSong', data => {
  $.ajax({
    url: 'https://api.spotify.com/v1/me/player/pause',
    contentType: 'application/json',
    type: 'PUT',
    dataType: 'json',
    headers: {
      Authorization: 'Bearer ' + access_token,
    },
    data: JSON.stringify({ device_id: userdeviceID }),
    success: function (response) {},
  });
});

socket.on('queueSong', data => {
  console.log(data.uri + " " + userdeviceID + " In queue");
  $.ajax({
    url: 'https://api.spotify.com/v1/me/player/queue?' + $.param({ uri: data.uri, device_id: userdeviceID }),
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + access_token,
    },
    success: function (response) {console.log("song queued")},

  });
});

socket.on('resumeSong', data => {
  $.ajax({
    url: 'https://api.spotify.com/v1/me/player/play',
    contentType: 'application/json',
    type: 'PUT',
    dataType: 'json',
    headers: {
      Authorization: 'Bearer ' + access_token,
    },
    data: '',
    success: function (response) {},
  });
});

socket.on('showLyrics', data => {
  console.log(data);
  console.log("we're in");
});

const getUserDeviceInfo = () => {
  $.ajax({
    url: 'https://api.spotify.com/v1/me/player/devices',
    headers: {
      Authorization: 'Bearer ' + access_token,
    },
    json: true,
  }).done(function (response) {
    for (var i = 0; i < response.devices.length; i++) {
      if (response.devices[i]['is_active'] == true) {
        userdeviceID = response.devices[i]['id'];
      } else if (response.devices.length == 1) {
        userdeviceID = response.devices[i]['id'];
      } else if (response.devices[i]['type'] == 'Computer') {
        userdeviceID = response.devices[i]['id'];
      }
    }

    console.log('DeviceID ' + userdeviceID);
    console.log(response);
    var deviceArray = [];
    deviceArray[0] = userdeviceID;
    $.ajax({
      url: 'https://api.spotify.com/v1/me/player',
      headers: {
        Authorization: 'Bearer ' + access_token,
      },
      contentType: 'application/json',
      type: 'PUT',
      data: JSON.stringify({ device_ids: [userdeviceID] }),
    }).done(function (response) {
      console.log('Playback successfully transferred');
    });
  });
}

setTimeout(refreshToken, 1000000);
getUserDeviceInfo();






document.getElementById('channel1').addEventListener('click', function () {
  if ($(this).hasClass('paused')) {
    leaveChannel('channel2');
    joinChannel('channel1');
    $(this).toggleClass('paused');
    $('#channel1').attr('src', 'https://simpleicon.com/wp-content/uploads/pause.png');
    $('#channel2').attr('src', 'http://simpleicon.com/wp-content/uploads/play1-64x64.png');
    $('#channel2').addClass('paused');
  } else {
    leaveChannel('channel1');
    $(this).toggleClass('paused');
    $('#channel1').attr('src', 'http://simpleicon.com/wp-content/uploads/play1-64x64.png');
  }
});

document.getElementById('channel2').addEventListener('click', function () {
  if ($(this).hasClass('paused')) {
    leaveChannel('channel1');
    joinChannel('channel2');
    $(this).toggleClass('paused');
    $('#channel2').attr('src', 'https://simpleicon.com/wp-content/uploads/pause.png');
    $('#channel1').attr('src', 'http://simpleicon.com/wp-content/uploads/play1-64x64.png');
    $('#channel1').addClass('paused');
  } else {
    leaveChannel('channel2');
    $(this).toggleClass('paused');
    $('#channel2').attr('src', 'http://simpleicon.com/wp-content/uploads/play1-64x64.png');
  }
});

$(document).on('click', '.addSong', function () {
  var selectedSong;
  selectedSong = $(this).attr('id');

  $.ajax({
    url: 'https://api.spotify.com/v1/me/tracks',
    contentType: 'application/json',
    type: 'PUT',
    dataType: 'json',
    headers: {
      Authorization: 'Bearer ' + access_token,
    },
    data: JSON.stringify({ ids: [selectedSong] }),
    success: function (response) {},
  });

  $(this).attr(
    'src',
    'https://cdn1.iconfinder.com/data/icons/freeline/32/accept_check_ok_outline_tick_yes-20.png',
  );
});

$(document).ajaxError(function (event, jqxhr, settings, exception) {
  if (jqxhr.status == 401) {
    refreshToken();
  }
});
