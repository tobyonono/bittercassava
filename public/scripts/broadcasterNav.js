let modal = document.querySelector('#modal');
let modalOverlay = document.querySelector('#modal-overlay');
let closeButton = document.querySelector('#close-button');
let openButton = document.querySelector('#openHistory');

closeButton.addEventListener('click', function () {
  modal.classList.toggle('closed');
  modalOverlay.classList.toggle('closed');
});

openButton.addEventListener('click', function () {
  modal.classList.toggle('closed');
  modalOverlay.classList.toggle('closed');
  openButton.classList.toggle('bright');
});
