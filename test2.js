var util = require('./util2'); 

//util.login();

//getStudentSummaryByProgramInfo
/*util.getStudentSummaryByProgramInfo('2558','207',function(result) {
  console.log(result);
  
});*/

/*util.getStudentByProgramInfo('2558','207','11307010055',function(result) {
  console.log(result);
  
  
  
});*/


util.getStudentInfo('56361938',function(result) {
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
