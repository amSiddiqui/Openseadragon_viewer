var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Opensea Dragon App' });
});

router.get('/view', function (req, res, next) {
  res.render('viewer');
});

router.get('/geo', function (req, res, next) {
  res.render('geo');
});

router.get('/mirador', function (req, res, next) {
  res.render('mirador');
});

router.get('/support', function (req, res, next) {
  res.render('support');
});

router.get('/paper', function (req, res, next) {
  res.render('paper');
});



module.exports = router;
