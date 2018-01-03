// STEEM BOT FOR STEEM-VERSARY

const moment = require('moment');
const req = require('request');
const rp = require('request-promise-native');
const steem = require('steem');
const prettyjson = require('prettyjson');

const BOT_ACCOUNT_NAME = '';
const BOT_ACCOUNT_WIF = ''


function getAniversaryData(){
    // get list of relevant versary users from steemSQL
    let dateToday = new Date();
    let dateLastYear = new Date(dateToday.getTime() - (365 * 24 * 60 * 60 * 1000));
    let dateLastYearTomorrow = new Date(dateToday.getTime() + (24 * 60 * 60 * 1000) - (365 * 24 * 60 * 60 * 1000));
    let lastYeaToday = dateLastYear.getFullYear()+'/'+(dateLastYear.getMonth()+1)+'/'+dateLastYear.getDate();
    let lastYearTomorrow = dateLastYearTomorrow.getFullYear()+'/'+(dateLastYearTomorrow.getMonth()+1)+'/'+dateLastYearTomorrow.getDate() ;

    let sqlQuery = `SELECT * FROM TxAccountCreates WHERE timestamp >= '${lastYeaToday}' AND timestamp < '${lastYearTomorrow}' ORDER BY CONVERT(DATE, timestamp) DESC`
    return rp.post( {
      url: 'https://sql.steemhelpers.com/api',
      form : { query : sqlQuery },
      method: 'POST'
    })
}

function processNamesToAccounts(data){
  let json = JSON.parse(data)
  let userNames = json.rows.map(user => user.new_account_name)
  return new Promise((resolve, reject) => {
    steem.api.getAccounts(userNames, (err, response) => {
      resolve(response)
    })
  })
}

function processActiveUsers(users){
  return new Promise((resolve, reject) => {

    let now = moment().valueOf();
    let sixDaysInSeconds = ( 6 * 24 * 60 * 60 * 1000)
    let activeUsers = users.filter( user => {
        return moment(user.last_root_post).valueOf() >= (now - sixDaysInSeconds)
    })
    resolve(activeUsers);
  })
}

function getLatestPost(users){
  // console.log(users)
  var userNames = users.map(user => user.name);
  console.log(userNames);
  return new Promise((resolvePosts, reject) => {
      let posts = [];
      userNames.forEach(function (userName,i,arr){
        posts.push( new Promise((resolve, reject) => {
          steem.api.getDiscussionsByAuthorBeforeDate(userName,null, new Date().toISOString().split('.')[0],1, (err, result) => {
              resolve( result )
          })
        }))
      });

      Promise.all(posts).then(data => resolvePosts(data))
  })
}

// get latest post of each user who has post in the last 6 days
getAniversaryData()
  .then(data => processNamesToAccounts(data))
  .then(data => processActiveUsers(data))
  .then(data => getLatestPost(data))
  // .then(data => sendVotes(data))

  function calcVoteWeight(posts){
    let totalActiveAuthors = posts.length;
    let votesPerDay = 10;
    let minVoteWeightPerUser = Math.floor( (votesPerDay/totalActiveAuthors) * 100 * 100 )
    return minVoteWeightPerUser > 10000 ? 10000 : minVoteWeightPerUser
  }

  function sendVotes(activePosts){

      let voteWeightPerUser = calcVoteWeight(activePosts);

      let votePromises = [];
      return new Promise((resolveVotes, reject) => {
          activePosts.forEach((post,i,arr) => {
              let permalink = post[0].url.substring(1)
              let author = post[0].author
              let voteWeight = voteWeightPerUser
              vote.Promises.push(
                  new Promise((resolve, reject) => {
                      steem.broadcast.vote(BOT_ACCOUNT_WIF, BOT_ACCOUNT_NAME, author, permalink, voteWeight, function(err, result) {
                          resolve(result);
                      });
                  })
              )
          })
          Promise.all(votePromises).then(data => resolveVotes(data))
      })
  }

  function randomString() {
    return '_' + Math.random().toString(36).substr(2, 16);
  }
  //
  // let commentTitle = 'Your Steem-Versay has arrived, Congratulations';
  // let uniqueString = randomString();
  // let beneficiaries = [];
  // beneficiaries.push({
  //       account: 'sambillingham',
  //       weight: 100*25
  //   });
  // let operations = [
  //         ['comment',
  //             {
  //                 parent_author: 'sambillingham',
  //                 parent_permlink: '20171226t151234088z-post',
  //                 author: BOT_ACCOUNT_NAME,
  //                 permlink: 'thisisjustatestyoucantotallyignoreitokaythanksplz',
  //                 title: commentTitle,
  //                 body: 'This Is Just A Test. Hey!',
  //                 json_metadata : JSON.stringify({
  //                 tags: 'steem-versary',
  //                 app: 'steem-versary'
  //                 })
  //             }
  //         ],
  //         ['comment_options', {
  //             author: BOT_ACCOUNT_NAME,
  //             permlink: 'thisisjustatestyoucantotallyignoreitokaythanksplz',
  //             max_accepted_payout: '100000.000 SBD',
  //             percent_steem_dollars: 10000,
  //             allow_votes: true,
  //             allow_curation_rewards: true,
  //             extensions: [
  //                 [0, {
  //                     beneficiaries: beneficiaries
  //                 }]
  //             ]
  //         }]
  //     ];
  //     steem.broadcast.send(
  //         { operations: operations, extensions: [] },
  //         { posting: BOT_ACCOUNT_WIF },
  //         function(err, result) {
  //   console.log(err, result);
  // });

// vote with bot account
// add comment with bot account
