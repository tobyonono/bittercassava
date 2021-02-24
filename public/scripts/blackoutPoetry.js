import {getRandomInt, getRandomLineNumber} from '../helperFuncs/helpers';

const generateBlackout = (lyrics, artistName, songName) => {
  let poem = lyrics;
  let poem_lines = poem.split(/\r\n|\r|\n/);
  poem_lines = poem_lines.filter(item => item);
  let poem_num_lines = poem_lines.length;
  let poem_text = [];

  for (var i = 0; i < poem_num_lines; i++) {
      // deconstruct string to array of words
      let words_in_line = poem_lines[i].split(" ");
      var num_words = words_in_line.length + 1;

      // get random # of words to hide
      var index_of_words_to_hide = getWhichWordstoBlackout(num_words);

      // add blackout to words
      for (var j = 0; j < index_of_words_to_hide.length; j++) {
        words_in_line[index_of_words_to_hide[j]] =
          '<span class="blackout">' +
          words_in_line[index_of_words_to_hide[j]] +
          "</span>";
      }


      poem_lines[i] = convertBackToString(words_in_line);
    }

    // format all poem text into string with line breaks
   for (var i = 0; i < poem_num_lines; i++) {
     poem_text += poem_lines[i] + "<br>";
   }

   window.setTimeout(function() {
      $("#title").html("<p>" + "Title: " + songName + "</p>");
      $("#author").html("<p>" + "Author: " + artistName + "</p>");
      $("#poem").html("<p>" + poem_text + "</p>");
    }, 300);

    return false;

};

const convertBackToString = array_of_words => {
  let poem_text = "";

  for (let i = 0; i < array_of_words.length - 1; i++) {
    poem_text += array_of_words[i];

    // if the current word and the next word start with span, it means the space in between
    // should be a span
    if (
      array_of_words[i].startsWith("<s") &&
      array_of_words[i + 1].startsWith("<s")
    ) {
      poem_text += '<span class="blackout"> </span>';
    } else {
      poem_text += " ";
    }
  }
  return poem_text;
}

const getWhichWordstoBlackout = num_words_in_sentence => {
  const MIN_PERECENT_OF_WORDS_TO_BLACKOUT = 0.8;

  // lets make sure its at least 80% of the sentence
  let number_of_words_to_hide = helpers.getRandomInt(
    Math.floor(num_words_in_sentence * MIN_PERECENT_OF_WORDS_TO_BLACKOUT),
    num_words_in_sentence
  );

  // loop through number of words to hide until you have enough
  let index_of_words_to_hide = [];

  for (
    let i = 0;
    index_of_words_to_hide.length < number_of_words_to_hide;
    i++
  ) {
    index_of_words_to_hide.push(helpers.getRandomInt(0, num_words_in_sentence));

    // set everytime to make sure numbers stay unique
    index_of_words_to_hide = [...new Set(index_of_words_to_hide)];
  }

  return index_of_words_to_hide;
}

export {generateBlackout};
