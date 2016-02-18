PManager.load('jquery', function(obj, err){
    var $ = obj.jquery;
    setInterval(function(){
        $('#time').text((new Date()).toString());   
    }, 1000);
});