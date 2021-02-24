let modal = document.querySelector('#modal');
let modalOverlay = document.querySelector('#modal-overlay');
let closeButton = document.querySelector('#close-button');
let openButton = document.querySelector('#openHistory');

let poetry = document.querySelector('#poetry');
let poetryCloseButton = document.querySelector('#poetryCloseButton');
let poetryOpenButton = document.querySelector('#openPoetry');



closeButton.addEventListener('click', function () {
  modal.classList.toggle('closed');
  modalOverlay.classList.toggle('closed');
});

poetryCloseButton.addEventListener('click', function () {
  poetry.classList.toggle('closed');
  modalOverlay.classList.toggle('closed');
});

openButton.addEventListener('click', function () {
  modal.classList.toggle('closed');
  modalOverlay.classList.toggle('closed');
  openButton.classList.toggle('bright');
});

poetryOpenButton.addEventListener('click', function () {
  poetry.classList.toggle('closed');
  modalOverlay.classList.toggle('closed');
  poetryOpenButton.classList.toggle('bright');
});
