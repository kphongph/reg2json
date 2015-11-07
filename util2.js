var http = require('http'); 
var config = require('./config');
var iconv = require('iconv-lite');
var htmlToJson = require('html-to-json');
var querystring = require('querystring');
var util = require('util');

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

exports.getStudentSummaryByProgramInfo = function(year,faculty_id,cb) {
  var config = {
    acadyear:year,
    faculty_id:faculty_id
  }

  login(function(ck,links) {
    var studentByProgram_url = '';
 
    for(var i=0;i<links.length;i++) {
      if((/^studentByProgram/).test(links[i].href)) {
        studentByProgram_url = links[i].href;
      }
    }

    console.log('studentByProgram',studentByProgram_url);

   
   
    var options = {
      hostname:'reg.nu.ac.th',
      path:'/registrar/'+studentByProgram_url,
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
            if((/^studentByProgram/).test(forms[i])) {
              action_url = forms[i];
            }
          }
          submit_form(ck,action_url,config,cb);
        });
      });
    });

    req.end();

    var submit_form = function(cookie,action_url,config,cb) {
      console.log('submit_form');
      console.log(action_url);
      var postData = querystring.stringify({
         'acadyear':config.acadyear,
        'facultyid':config.faculty_id
       
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
          
          var a_herf = [];
        getLink(utf8str,function(links) {
        // console.log(links);
          
         
          for(var i=0;i<links.length;i++) {
              
                //var split1 =links[i].href.split('?');
                //console.log("split1 = "+split1.length);
              
            if((/^studentByProgram/).test(links[i].href)) {
                var split1 =links[i].href.split('?');
                //console.log("split1 = "+split1.length);
                
                if(split1.length==2){
                    
                    var split_amp=split1[1].split('&');
                   
                    if(split_amp.length>2){
                        
                        //var split_val=split_amp[1].split('=');
                        
                         var tmp = {
                            'value' :links[i].text,
                             //'link':links[i].href,
                             //'tail':split1[1],
                             'amp_tail_count':split_amp.length,
                             'amp_value_list':split_amp,
                             'program_id':split_amp[4].split('=')[1],
                             'cmd':split_amp[0].split('=')[1],
                             'campusid':split_amp[1].split('=')[1],
                             'acadyear':split_amp[2].split('=')[1],
                             'facultyid':split_amp[3].split('=')[1],
                             'flag':split_amp[5].split('=')[0]+'='+split_amp[5].split('=')[1],
                             
                             'status':(split_amp.length==6)?'':split_amp[6].split('=')[1].replace(/\s+/g,''),
                           //  'flag_status':(split_amp.length==6)?'entrance':(split_amp[6].split('=')[1].replace(/\s+/g,'')=='STUDENTSTATUS%3E%3D50')?'reject':'other',
                             'flag_status':function(){
                                 if(split_amp.length==6){
                                     return 'entrance';
                                 }else if(split_amp[6].split('=')[1].replace(/\s+/g,'')=='STUDENTSTATUS%3E%3D50'){
                                     return 'reject';
                                 }else if(split_amp[6].split('=')[1].replace(/\s+/g,'')=='STUDENTSTATUS%3E%3D40+AND+STUDENTSTATUS%3C50'){
                                     return 'successfully';
                                 }else if(split_amp[6].split('=')[1].replace(/\s+/g,'')=='%28STUDENTSTATUS%3E%3D10+AND+STUDENTSTATUS%3C20%29'){
                                     return 'register';
                                 }else if(split_amp[6].split('=')[1].replace(/\s+/g,'')=='%28STUDENTSTATUS%3E%3D20+AND+STUDENTSTATUS%3C23%29'){
                                     return 'no_register';
                                 }
                             }
                          }

                         a_herf.push(tmp);
                        
                    }
                }
                

            }
          
            
          }
          
         //console.log(a_herf);
         
        });
        
        htmlToJson.parse(utf8str, {
            
		 
		 'tr': ['tr', function($tr) {
          var tmp = {'count':$tr.children().length,'text':$tr.text()};

          for(var i=0;i<$tr.children().length;i++) {
            tmp['td'+i] = $tr.children(i).text();
           }
  			return tmp;
	     }] 
        }, function(err, result) {
            
             var group_row = 0;
             var curriculum_group = [];
             var faculty_name='';
             
             for(var i=0;i<result.tr.length;i++) {
                 
                 
                 if((i==13) ){
                     faculty_name=result.tr[i].td0.replace(/\s+/g,'');
                     
                     //console.log('result',result.tr[i].td0);
                     
                 }
                 
                 if(result.tr[i].count == 6) {
                  //group_row = i;
                  group_row++;
                  
                 var tmp = {
                     
                    'id' :result.tr[i].td0.split(':')[0].replace(/\s+/g,''),
                    'name':result.tr[i].td0.split(':')[1],
                    'entrance':result.tr[i].td1,
                    'reject':result.tr[i].td2,
                    'successfully':result.tr[i].td3,
                    'register':result.tr[i].td4,
                    'no_register':result.tr[i].td5
                 }
                 
                 if(Number(tmp.id)){
                      curriculum_group.push(tmp);
                 }
                

                  //break;
                 }
                 
                  var data ={
                      'faculty_name':faculty_name,
                      'acadyear':config.acadyear,
                      'curriculum':curriculum_group
                  }
             }
             
             

            //console.log('result',result);
            cb(data);
        });
      });
    });

        req.write(postData);
        req.end(); //submit_form
    }// end submit_form
     

 });
};





exports.getStudentByProgramInfo = function(year,faculty_id,curriculum_id,cb) {
  var config = {
    acadyear:year,
    faculty_id:faculty_id,
    curriculum_id:curriculum_id
  }

  login(function(ck,links) {
    var studentByProgram_url = '';
 
    for(var i=0;i<links.length;i++) {
      if((/^studentByProgram/).test(links[i].href)) {
        studentByProgram_url = links[i].href;
      }
    }

    console.log('studentByProgram',studentByProgram_url);

   
   
    var options = {
      hostname:'reg.nu.ac.th',
      path:'/registrar/'+studentByProgram_url,
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
            if((/^studentByProgram/).test(forms[i])) {
              action_url = forms[i];
            }
          }
          submit_form(ck,action_url,config,cb);
        });
      });
    });

    req.end();

    var submit_form = function(cookie,action_url,config,cb) {
      console.log('submit_form');
      console.log(action_url);
      var postData = querystring.stringify({
         'acadyear':config.acadyear,
        'facultyid':config.faculty_id
       
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
          
        var a_herf = [];


        getLink(utf8str,function(links) {
        // console.log(links);
          
         
          for(var i=0;i<links.length;i++) {
              
                //var split1 =links[i].href.split('?');
                //console.log("split1 = "+split1.length);
              
            if((/^studentByProgram/).test(links[i].href)) {
                var split1 =links[i].href.split('?');
                //console.log("split1 = "+split1.length);
                
                if(split1.length==2){
                    
                    var split_amp=split1[1].split('&');
                   
                    if(split_amp.length>2){
                        
                        //var split_val=split_amp[1].split('=');
                        
                         var tmp = {
                            'value' :links[i].text,
                             'link':links[i].href,
                             //'tail':split1[1],
                             'amp_tail_count':split_amp.length,
                             'amp_value_list':split_amp,
                             'program_id':split_amp[4].split('=')[1].replace(/\s+/g,''),
                             'cmd':split_amp[0].split('=')[1],
                             'campusid':split_amp[1].split('=')[1],
                             'acadyear':split_amp[2].split('=')[1],
                             'facultyid':split_amp[3].split('=')[1],
                             'flag':split_amp[5].split('=')[0]+'='+split_amp[5].split('=')[1],
                             'status':(split_amp.length==6)?'':split_amp[6].split('=')[1].replace(/\s+/g,''),
                          }
                        
                         if((tmp.program_id==config.curriculum_id)&(tmp.amp_tail_count==6)){
                              a_herf.push(tmp);
                         }

                    }
                }
            }

          }
          
           //console.log(a_herf);
           
              if(a_herf.length==1){    
                 submit_form_student(ck,a_herf[0].link,config,cb);
              }else{
                 console.log('curriculum_id invalid');
              }
        
         
        });
        

        
      });
    });

        req.write(postData);
        req.end(); //submit_form
    }// end submit_form
     

     var submit_form_student = function(cookie,action_url,config,cb) {
        console.log('target url is :'+action_url);
          
        /*var postData = querystring.stringify({
         'acadyear':config.acadyear,
         'facultyid':config.faculty_id
       
        });*/
      
      
        var options = {
         hostname:'reg.nu.ac.th',
         path:'/registrar/'+action_url,
         method:'GET',
         headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            //'Content-Length': postData.length,
            'Cookie':cookie
             }
         };
          

    var req = http.request(options, function(res) {
      toUTF8(res,function(utf8str) {
        htmlToJson.parse(utf8str, {
		 
		 'tr': ['tr', function($tr) {
          var tmp = {'count':$tr.children().length,'text':$tr.text()};

          for(var i=0;i<$tr.children().length;i++) {
            tmp['td'+i] = $tr.children(i).text();
           }
  			return tmp;
	     }] 


        }, function(err, result) {
            
            var student_list =[];
            
            for(var i=0;i<result.tr.length;i++) {
                if(result.tr[i].count==7){
                                            
                         var tmp = {
                            'student_id' :result.tr[i].td1,
                            'curriculum_id':config.curriculum_id,
                            'acadyear':config.acadyear,
                            'faculty_id':config.faculty_id,
                            'fullname':result.tr[i].td2,
                            'status_code':result.tr[i].td3,
                          }
                          
                          if(Number(tmp.student_id)){
                              student_list.push(tmp);
                          }
                          
                }
            }
            
            // check insert
           // console.log(result);
            cb(student_list);
        });
      });
    });  
          
        
       // req.write(postData);
        req.end();  
           //cb(data);
     } //submit_form_student

 });
};


exports.getStudentInfo = function(student_id,cb) {
  var config = {
    student_id:student_id
  }

  login(function(ck,links) {
    var student_info_url = '';
 
    for(var i=0;i<links.length;i++) {
      if((/^student_info/).test(links[i].href)) {
        student_info_url = links[i].href;
      }
    }

    console.log('get student info',student_info_url);

    //return;
   
    var options = {
      hostname:'reg.nu.ac.th',
      path:'/registrar/'+student_info_url,
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
            if((/^student_info/).test(forms[i])) {
              action_url = forms[i];
            }
          }
          submit_form(ck,action_url,config,cb);
        });
      });
    });

    req.end();

    var submit_form = function(cookie,action_url,config,cb) {
        
      console.log('submit_form');
      console.log(action_url);
      
      //return;
      var postData = querystring.stringify({
         'StudentCode':config.student_id
       
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
		 
		 'tr': ['tr', function($tr) {
          var tmp = {'count':$tr.children().length,'text':$tr.text()};

          for(var i=0;i<$tr.children().length;i++) {
            tmp['td'+i] = $tr.children(i).text();
           }
  			return tmp;
	     }] 


        }, function(err, result) {
            
            var student_info =[];
            var student_name='';
            var curriculum_number='';
            var curriculum_name='';
            var year ='';
            var gpa_x ='';
             
            for(var i=0;i<result.tr.length;i++) {
                
                
                 
                if(result.tr[i].count==4){
                                            

                          
                }
                
                if(i==9){
                    //student_name
                    student_name =result.tr[i].td1;
                }else if(i==10){
                    // "11307030055 
                    //curriculum_number
                     var arr=result.tr[i].td3.split(':');
                     
                     curriculum_number =arr[0];
                     curriculum_name=arr[1];
                
                }else if(i==12){
                    // "GPAX 

                     gpa_x=result.tr[i].td1;
                     
                     
                }else if(i>=15){
                    // check lenght
                    
                   
                     if(result.tr[i].count==9){
                         
                         //console.log('test');
                         
                         
                       
                         
                         if((result.tr[i].td0).replace(/\s+/g,'')==''){
                             
                         }else{
                              year=result.tr[i].td0;
                         }
                         
                          var tmp = {
                           // 'acadyear' :year,
                            'semester' :result.tr[i].td1,
                            'status' :result.tr[i].td2,
                            'description' :result.tr[i].td3,
                            'gpa':result.tr[i].td4,
                            'gpax':result.tr[i].td5,
                            'ca':result.tr[i].td6,
                            'cax':result.tr[i].td7
                          }
                          
                          tmp['acadyear']=year;
                          
                          
                         // if(Number(tmp.student_id)){
                              student_info.push(tmp);
                         // }
                     }
                    
                }
                
            }
            
            // check insert
            
                  var data ={
                      'student_name':student_name,
                      'student_id':config.student_id,
                      'gpa_x':gpa_x,
                      'curriculum_number':curriculum_number,
                      'curriculum_name':curriculum_name,
                      'info':student_info,
                      
                  }
            
            console.log(data);
            cb(data);
            
            //cb(result);
        });
      
      });
    });

        req.write(postData);
        req.end(); //submit_form
    }// end submit_form
     

 });
};