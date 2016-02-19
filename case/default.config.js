PManager.add([{
    jquery: {
        url: 'http://libs.baidu.com/jquery/1.7.1/jquery.min.js',
        module: '$',
        require: []
    },
    swiper: {
        url: 'http://cdn.bootcss.com/Swiper/2.7.0/idangerous.swiper.min.js',
        module: 'Swiper',
        styleList: [{href: 'http://cdn.bootcss.com/Swiper/2.7.0/idangerous.swiper.min.css'}],
        require: ['jquery']
    }
}]);