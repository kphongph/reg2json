var express = require('express');
var bodyParser = require('body-parser');
var htmlToJson = require('html-to-json');
var config = require('./config');
var util = require('./util');
var util2 = require('./util2');
var app = express();


app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/course/:year/:semester', function (req, res) {
   var url_path = 'http://reg.nu.ac.th/registrar/class_info_1.asp?'+
    'printfriendly=1&'+
    'coursestatus=O00&'+
    'facultyid=207%A4%B3%D0%C7%D4%C8%C7%A1%C3%C3%C1%C8%D2%CA%B5%C3%EC&'+
    'maxrow=500&'+
    'acadyear='+req.params.year+'&'+
    'semester='+req.params.semester+'&'+
    'CAMPUSID=&LEVELID=&coursecode=&coursename=&cmd=2&avs685944429=19&backto=home';

   //console.log(url_path);

   var regex = /(\d{6})/;
   util.getUTF8(url_path,function(utf8) {
     htmlToJson.parse(utf8, {
       'text':['a', function($a) {
         var result = $a.text().match(regex);
         if(result) {
           return {'id':$a.text(),'href':$a.attr('href')};
         }
       }]
     }, function(err, result) {
       var course_key = {};
       for(var i=0;i<result.text.length;i++) {
         if(result.text[i]!=null) {
           if(!course_key[result.text[i].id]) {
             course_key[result.text[i].id] = [];
           }
           course_key[result.text[i].id].push(result.text[i].href);
         }
       }
       var course_list = [];
       for(var key in course_key) {
         course_list.push({'id':key,'sec':course_key[key]});
       }
       res.json(course_list);
     });
   });
   
});

app.get('/course/:year/:semester/:course', function (req, res) {
  util.getCourseInfo(req.params.year,req.params.semester,req.params.course,function(result) {  
	res.json(result);
  });
});

app.get('/student/:year/:facultyid', function (req, res) {
  util2.getStudentSummaryByProgramInfo(req.params.year,req.params.facultyid,function(result) {  
	res.json(result);
  });
});

app.get('/student/:year/:facultyid/:curriculum_id', function (req, res) {
  util2.getStudentByProgramInfo(req.params.year,req.params.facultyid,req.params.curriculum_id,function(result) {  
	res.json(result);
  });
});

app.get('/studentinfo/:student_id', function (req, res) {
  util2.getStudentInfo(req.params.student_id,function(result) {  
	res.json(result);
  });
});


require('./lib/rest')(app, config.mongorest);


var server = app.listen(process.env.PORT, function () {
  var host = process.env.IP;
  var port = process.env.PORT;

  console.log('Example app listening at http://%s:%s', host, port);
});
