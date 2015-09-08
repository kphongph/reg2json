var util = require('./util'); 

//util.login();
util.getCourseInfo('2556','1','305501',function(result) {
  console.log(result);
});

/*

util.getCourseInfo('2556','1','305501',function(sections) {
  console.log(sections);
  for(var i=0;i<sections.length;i++) {
    util.getSectionInfo(sections[i].href,function(studentInClass) {
      console.log(studentInClass);
      for(var j=0;j<studentInClass.length;j++) {
        util.getStudentInClass(studentInClass[j].href,function(result) {
        });
      }
    });
  }
});
*/
