exports.generateRandomString = function (length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

exports.getRandomInt = (min, max) => {
// lets make sure they're integers
min = Math.ceil(min);
max = Math.floor(max);

return Math.floor(Math.random() * (max - min)) + min;
}

exports.getRandomLineNumber = () => getRandomInt(2, 10);
