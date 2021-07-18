// node module imports
const express = require("express");
const path = require("path");
var fs = require("fs");
const fetch = require("node-fetch");
const rp = require("request-promise");

const app = express();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => console.log(`Server local host running on ${PORT}`));

var url = "http://norvig.com/big.txt";
var v1path = __dirname + "/files/newFile.txt";

const URL_part1 =
  "https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=";
const URL_API_KEY =
  "dict.1.1.20210216T114936Z.e4989dccd61b9626.373cddfbfb8a3b2ff30a03392b4e0b076f14cff9";
const URL_part2 = "&lang=en-ru&text=";

const downloadFile = async (url, v1path) => {
  const res = await fetch(url);

  const fileStream = fs.createWriteStream(v1path);

  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
};

downloadFile(url, v1path);

var data2 = "";
if (fs.existsSync(v1path)) {
  data2 = fs.readFileSync(v1path, { encoding: "utf8" });
} else {
  console.log("doesn't exit ", __dirname, v1path);
}

var allWords = data2.split(/\b/);
var wordCountList = {};

allWords.forEach(function (word) {
  if (word !== " " && /^[a-zA-Z]+$/.test(word)) {
    if (!wordCountList.hasOwnProperty(word)) {
      wordCountList[word] = { word: word, count: 0 };
    }
    wordCountList[word].count++;
  }
});

var sortable = [];
for (var propName in wordCountList) {
  sortable.push([propName, wordCountList[propName]]);
}

sortable.sort(function (a, b) {
  return a[1].count - b[1].count;
});

var final_words_list = sortable.slice(Math.max(sortable.length - 10, 0));

function make_api_call(final_word) {
  return rp({
    url: `${URL_part1}${URL_API_KEY}${URL_part2}${final_word}`,
    method: "GET",
    json: true,
  });
}

async function processDictionaryLookup() {
  let result;
  let promises = [];
  for (let i = 0; i < final_words_list.length; i++) {
    promises.push(make_api_call(final_words_list[i][1].word));
  }
  result = await Promise.all(promises);
  for (let i = 0; i < final_words_list.length; i++) {
    final_words_list[i]["APIoutput"] = JSON.stringify(result[i].def);
  }
  return final_words_list;
}

async function lookupYandex() {
  let result = await processDictionaryLookup();
  frameJsonOfResult(result);
}

function frameJsonOfResult(result) {
  var tenWordsDetailedArray = [];
  for (i = 0; i < 10; i++) {
    var pos = [];
    if (result[i].APIoutput !== [] && result[i].APIoutput !== "[]") {
      JSON.parse(result[i].APIoutput).forEach((pussy) => {
        if (typeof pussy.pos === "string") {
          pos.push(pussy.pos);
        }
      });
    }

    var means = [];
    if (result[i].APIoutput !== [] && result[i].APIoutput !== "[]") {
      JSON.parse(result[i].APIoutput).forEach((mean) => {
        for (const property in mean.tr) {
          const meanTest = mean.tr[property].mean ? mean.tr[property].mean : "";
          if (typeof meanTest === "object") {
            for (const property2 in mean.tr[property].mean) {
              means.push(mean.tr[property].mean[property2].text);
            }
          }
        }
      });
    }

    // tenWordsDetailedArray.push({
    //   Word: result[i][0],
    //   Output: {
    //     Count: result[i][1].count,
    //     Pos: JSON.stringify(pos),
    //     Synonyms: JSON.stringify(means),
    //   },
    // });

    tenWordsDetailedArray.push({
      Word: result[i][0],
      Output: {
        Count: result[i][1].count,
        Pos: pos,
        Synonyms: means,
      },
    });
  }
  // console.log("Final List 0 ::", tenWordsDetailedArray);
  console.log("Final List in JSON ::", JSON.stringify(tenWordsDetailedArray));
}
lookupYandex();
