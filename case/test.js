PManager.load('jquery, swiper', function(obj, err){
    console.log(obj, err);
    var $ = obj.jquery,
        Swiper = obj.swiper;
    setInterval(updateTime, 1000);
    function updateTime(){
        $('#time').text((new Date()).toString());
    }
    updateTime();
    new Swiper('.swiper-container', {
        autoplay: 2000
    })
});