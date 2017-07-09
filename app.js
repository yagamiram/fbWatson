/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * file modified by Dhanush
 */

'use strict';

var express = require('express'),
  app       = express(),
  util      = require('util'),
  extend    = util._extend,
  watson    = require('watson-developer-cloud'),
  PersonalityInsightsV3 = require('watson-developer-cloud/personality-insights/v3'),
  Q         = require('q'),
  isString  = function (x) { return typeof x === 'string'; };
var axios = require('axios');
const levenshtein = require('js-levenshtein');

// Bootstrap application settings
require('./config/express')(app);

var personalityInsights = watson.personality_insights({
  username: '9c91bce0-4425-4ca5-9e0f-1dba6e00fbdd',
  password: 'I6VTma8dX1hs',
  version: 'v2'
});

var personality_insights = new PersonalityInsightsV3({
  username: '9c91bce0-4425-4ca5-9e0f-1dba6e00fbdd',
  password: 'I6VTma8dX1hs',
  version_date: '2016-10-20'
});

var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');
var natural_language_understanding = new NaturalLanguageUnderstandingV1({
  'username': '6a323b1f-227e-4aaa-9a58-a5e07d50af0a',
  'password': 'OjtB3pN2btmJ',
  'version_date': '2017-02-27'
});



var params = {
  // Get the content items from the JSON file.
  content_items: require('./profile.json').contentItems,
  consumption_preferences: true,
  raw_scores: true,
  headers: {
    'accept-language': 'en',
    'accept': 'application/json'
  }
};

var personalityInsightsOfAUser = null;

var adTerms = [];
var resultant_videos = [];


// Creates a promise-returning function from a Node.js-style function
var getProfile = Q.denodeify(personalityInsights.profile.bind(personalityInsights));
var getProfile3 = Q.denodeify(personality_insights.profile.bind(personality_insights));

app.get('/', function(req, res) {
  res.render('index', { ct: req._csrfToken });
});

app.post('/api/profile/text', function(req, res, next) {
  console.log("Inside the post function")
  getProfile(req.body)
    .then(function(response){
        //console.log("the response is", response)
        res.json(response[0]);
      })
    .catch(next)
    .done();
});

app.post('/api/profile/personalityInsightsOfAUser', function(req, res, next) {
  //console.log("Inside the personalityInsightsOfAUser", req.body)
  personality_insights.profile(req.body, function(error, response) {
    if (error)
      console.log('Error:', error);
    else
      //console.log(JSON.stringify(response, null, 2));
      personalityInsightsOfAUser = response;
    }
  );

  // Do stuffs here
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.parse(personalityInsightsOfAUser));
});

app.post('/api/profile/TaxonomyForUserInterests', function(req, res, next) {
  console.log("Inside the TaxonomyForUserInterests", req.body.text)
  var keywords = req.body.text
  Object.keys(keywords).forEach(function(key) {
    var nlpParameters = {
      'text': keywords[key],
      'features': {
        'categories': {}
      }
    }

    natural_language_understanding.analyze(nlpParameters, function(err, response) {
      if (err)
        console.log('error:', err);
      else {
        console.log(response);
        var categoriesDatas = response['categories'];
        if (categoriesDatas.length > 0) {
          adTerms.push(categoriesDatas[0]['label']);
        }
        console.log(adTerms);
      }
      // Get the content of the JSON
      var videos = require('./data.json');
      //console.log(JSON.stringify(jsonData));

      for(var each_like in adTerms) {
        var like_value = adTerms[each_like];
        for (var each_video_obj in videos) {
          var video_terms = videos[each_video_obj];
          for (var each_video_term in video_terms) {
            var video_term = video_terms[each_video_term]
            if (video_term.includes(like_value) && ! resultant_videos.includes(each_video_obj)){
              resultant_videos.push(each_video_obj);
            }
          }
        }
      }
      console.log("the resultant_videos are", resultant_videos)
    });

  });

  res.send(JSON.parse(personalityInsightsOfAUser));
});

app.get('/VideoLinks', (req,res) => {
  res.send(resultant_videos);
});


// error-handler settings
require('./config/error-handler')(app);

var port = process.env.VCAP_APP_PORT || 3000;
app.listen(port);
console.log('listening at:', port);
