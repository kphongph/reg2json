var http = require('http'); 
var config = require('./config');
var iconv = require('iconv-lite');
var htmlToJson = require('html-to-json');
var querystring = require('querystring');

exports.getUTF8 = function(url_path,cb) {
  http.get(url_path , function(res) {
    var str = [];
    res.on('data', function(chunk) {
      str.push(chunk);
    });

    res.on('end', function() {
      var total = 0;
      for(var i=0;i<str.length;i++) {
        total+=str[i].length;
      }
      var content = Buffer.concat(str,total);
      var utf8st=iconv.decode(content,'win874');
      cb(utf8st);
   });
 });
};

var getLink = function(str,cb) {
   htmlToJson.parse(str, {
     'links':['a', function($a) {
       var tmp = {
         'href':$a.attr('href'),
         'text':$a.text()
       };
       return tmp;
     }]
   }, function(err, result) {
     cb(result.links);
   });
}

var toUTF8 = function(res,cb) {
  var str = [];
  res.on('data', function(chunk) {
    str.push(chunk);
  });

  res.on('end', function() {
    var total = 0;
    for(var i=0;i<str.length;i++) {
      total+=str[i].length;
    }
    var content = Buffer.concat(str,total);
    var utf8st=iconv.decode(content,'win874');
    cb(utf8st);
  });
};

var login = function(cb) {
  var cookies = '';

  var get_buildkey = function(cb) {
   var options = {
     hostname:'reg.nu.ac.th',
     path:'/registrar/login.asp',
     method:'GET'
   };

   var req = http.request(options, function(res) {
      cookies = res.headers['set-cookie'][0];
      var str = '';
      res.on('data', function(chunk) {
        str+=chunk;
      });
      res.on('end', function() {
        htmlToJson.parse(str, {
         'input':['input', function($input) {
           var tmp = {
             'name':$input.attr('name'), 
             'value':$input.attr('value')
           };
           return tmp;
         }]
        }, function(err, result) {
          var build_key = '';
          for(var i=0;i<result.input.length;i++) {
            if(result.input[i].name == 'BUILDKEY') {
              build_key = result.input[i].value;
              break;     
            }
          }
          cb(build_key);
        });
      });
   });
   req.end();
 };

 var go_staff = function(main_url) {
   var options = {
     hostname:'reg.nu.ac.th',
     path:main_url,
     method:'GET',
     headers: {
       'Cookie':cookies
     }
   };

   var req = http.request(options, function(res) {
     toUTF8(res, function(str) {
       getLink(str, function(links) {
         cb(cookies,links);
       });
     });
   });
   req.end();
 }


 var go_role = function(main_url) {
   var options = {
     hostname:'reg.nu.ac.th',
     path:'/registrar/'+main_url,
     method:'GET',
     headers: {
       'Cookie':cookies
     }
   };

   var req = http.request(options, function(res) {
     var str = '';
     res.on('data', function(chunk) {
       str+=chunk;
     });
     res.on('end', function() {
       htmlToJson.parse(str, {
        'url':function($doc) {
          return $doc.find('a').attr('href');
        }, 
       }, function(err, result) {
         go_staff(result.url);
       });
     });
   });
   req.end();
 }

 get_buildkey(function(build_key) {
   var postData = querystring.stringify({
     'BUILDKEY':build_key,
     'f_uid':config.user,
     'f_pwd':config.password
   });

   console.log(postData);

   var options = {
     hostname:'reg.nu.ac.th',
     path:'/registrar/validate.asp',
     method:'POST',
     headers: {
       'Content-Type': 'application/x-www-form-urlencoded',
       'Content-Length': postData.length,
       'Cookie':cookies
     }
   };

   var req = http.request(options, function(res) {
      var str = '';
      res.on('data', function(chunk) {
        str+=chunk;
      });
      res.on('end', function() {
        htmlToJson.parse(str, {
         'url':function($doc) {
           return $doc.find('a').attr('href');
         }, 
        }, function(err, result) {
          go_role(result.url);
          // logon success pass cookie
          // cb(cookies);
        });
      });
   });

   req.write(postData);
   req.end();

   // cb(build_key);
 });
};

exports.getCourseInfo = function(year,semester,courseid,cb) {
  var config = {
    year:year,
    semester:semester,
    courseid:courseid
  }

  login(function(ck,links) {
    var classinfo_url = '';
 
    for(var i=0;i<links.length;i++) {
      if((/^class_info/).test(links[i].href)) {
        classinfo_url = links[i].href;
      }
    }

    console.log('classinfo_url',classinfo_url);

    var options = {
      hostname:'reg.nu.ac.th',
      path:'/registrar/'+classinfo_url,
      method:'GET',
      headers: {
        'Cookie':ck
      }
    };

    var req = http.request(options, function(res) {
      toUTF8(res,function(utf8str) {
        htmlToJson.parse(utf8str, {
          'form': ['form',function($form) {
            return $form.attr("action");
          }]
        }, function(err, result) {
          var forms = result.form;
          var action_url = '';
          for(var i=0;i<forms.length;i++) {
            if((/^class_info_1/).test(forms[i])) {
              action_url = forms[i];
            }
          }
          submit_form(ck,action_url,config,cb);
        });
      });
    });

    req.end();

    var query_grade = function(cookie,url,cb) {
      console.log(url.href);
      var options = {
        hostname:'reg.nu.ac.th',
        path:'/registrar/'+url.href,
        method:'GET',
        headers: {
          'Cookie':cookie
        }
      };

      var req = http.request(options, function(res) {
        toUTF8(res,function(utf8str) {
          htmlToJson.parse(utf8str,{
            'tr':['tr',function($tr) {
              var tmp = {
                'id': $tr.children(1).text().replace(/\s+/g,''),
                'grade': $tr.children(5).text().replace(/\s+/g,'')
              }
              if(tmp.id.length<20) { 
                return tmp; 
              }
            }]
          }, function(err, result) {
            var r = [];
            var tr = result.tr;
            for(var i=0;i<tr.length;i++) {
              if(tr[i]&&(/\d{8}/).test(tr[i].id)) {
                r.push(tr[i]);
              }
             
            }
            cb(r);
          });
        });
      });
      req.end();
    };

    var query_section = function(cookie,url,cb) {
      console.log(url.href);
      var options = {
        hostname:'reg.nu.ac.th',
        path:'/registrar/'+url.href,
        method:'GET',
        headers: {
          'Cookie':cookie
        }
      };

      var req = http.request(options, function(res) {
        toUTF8(res,function(utf8str) {
		  var count=0;
		  htmlToJson.parse(utf8str, {
		    'font': ['font', function($tr) {
				var tmp = {'count':count,'value':$tr.text()};
				count++;
				//console.log(tmp);
				return tmp;
			}]
		  }, function(err, result) {
			// console.log(result);
            var section_info = {'id':result.font[0].value,'name':result.font[1].value,'result':result};
            console.log(section_info);
            getLink(utf8str,function(links) {
              for(var i=0;i<links.length;i++) {
                if((/^student_inclass/).test(links[i].href)) {
                  query_grade(cookie,links[i],function(grade_list) {  
					section_info['grade_list']=grade_list;
                    cb(section_info);
                  });
                }
              }
            });
		  });

        });
      });

      req.end();
    };
     
    var submit_form = function(cookie,action_url,config,cb) {
      console.log('submit_form');
      console.log(action_url);
      var postData = querystring.stringify({
        'coursestatus':'O00',
        'facultyid':'all',
        'maxrow':'500',
        'acadyear':config.year,
        'semester':config.semester,
        'coursecode':config.courseid,
        'cmd':2
      });

     var options = {
       hostname:'reg.nu.ac.th',
       path:'/registrar/'+action_url,
       method:'POST',
       headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length,
        'Cookie':cookie
       }
     };

    var req = http.request(options, function(res) {
      toUTF8(res,function(utf8str) {
        htmlToJson.parse(utf8str, {
         'sections':['a', function($a) {
           var tmp = {
             'href':$a.attr('href'),
             'text':$a.text()
           };
           return tmp;
         }]
        }, function(err, result) {
          var r = [];
          for(var i=0;i<result.sections.length;i++) {
            if(result.sections[i].text == courseid) {
              r.push(result.sections[i]);
            }
          }
          var ret = [];
          for(var i=0;i<r.length;i++) {
            query_section(cookie,r[i],function(section_info) {
              ret.push(section_info);
              if(ret.length==r.length) {
                cb(ret);
              }
            });
          }
        });
      });
    });

    req.write(postData);
    req.end();
   };
 });
};
