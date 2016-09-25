var dev, dist, trunk, root;
var gulp = require('gulp'); // gulp모듈
var argv = require('yargs').argv;

// JS task
var concat = require('gulp-concat'), // js 하나로 합치기
    uglify = require('gulp-uglify'), // js 압축
    jshint = require('gulp-jshint'); // js 오류검사
// CSS task
var cssmin = require('gulp-cssmin'), // css압축
    autoprefixer = require('gulp-autoprefixer'), // -webkit- 등 벤터 접두사 삽입
    csscomb = require('gulp-csscomb'), // css코드를 아름답게
    less = require('gulp-less');

// html task
var fileinclude = require('gulp-file-include');


// others task
var sourcemaps = require('gulp-sourcemaps'), // 소스맵 (chrome setting 소스맵 설정) - 원본소스와 변환된 소스를 맵핑
    watch = require('gulp-watch'), // 감시
    rename = require('gulp-rename'), // 이름변경
    plumber = require('gulp-plumber'), // error 발생시 프로세스 종료 방지
    spritesmith = require('gulp.spritesmith'), // 이미지 스프라이드    
    browserSync = require('browser-sync').create(), // 웹서버를 작동하면서, 자동 Reload, 기기별 위치 추적 지원
    cache = require('gulp-cached'); // watch의 변경된 파일만 감시
    gulpCopy = require('gulp-copy');
    convertEncoding = require('gulp-convert-encoding');


// COMMON file URL Change
gulp.task('default', function(){
    // gulp -t mobile 또는 gulp -t web으로 실행 할 task를 지정해줘야 된다.
    if(argv.t == undefined || argv.t == 'serve') {
        console.log('-------> 실행 할 테스크를 입력하세요.'); 
        error;
    }
    root = argv.t;    
    dev = '2016/' + root + '/src';
    dist = '2016/' + root + '/dist';
    trunk = '2016/' + root + '/00_live';
});

// WORK TASK
gulp.task('js_lint', function() {
    console.log('js_lint task 시작 < -------------');
    return gulp.src(dev + '/js/*.js')
        .pipe(plumber())
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(gulp.dest(dist + '/js'));
});
// JS
gulp.task('js', ['js_lint'], function() {
    return gulp.src(dist + '/js/*.js')
        .pipe(plumber())
        .pipe(cache('js'))
        .pipe(sourcemaps.init())
        .pipe(uglify({
            compress: {
                drop_console: true
            }
        }))
        .pipe(sourcemaps.write('./map'))
        //.pipe(concat('ui.js')) //JS연결
        .pipe(gulp.dest(dist + '/js'));
});

gulp.task('copy_frm', function() {
    return gulp.src(dev + '/doc/html/iframe/*.html')  // iframe
        .pipe(cache('copy_frm'))
        .pipe(gulpCopy(dist ,{
            prefix: 4 // 폴더 깊이 
        }));
});


gulp.task('html', function() {  
    console.log('html task 시작 <-------------');
        gulp.src([
            dev + '/doc/**/*.html',
            '!'+dev + '/doc/**/inc/*'
        ])
        //.pipe(cache('html'))
        .pipe(plumber())        
        .pipe(fileinclude({
            // 글로벌 변수
            context: {
                _js : {
                    'jqeury' : '<script type="text/javascript" src="http://m.2016.nate.com/js/jquery-1.8.3.min.js">',
                },
                _var: {
                    'param1': 'value1',
                    'param2': 'value2',
                    
                },
                _html : {
                    'top' : '<div class="scroll_up_v2"><a href="#header">맨위로</a></div>',
                    'temp' : 'http://m1.nateimg.co.kr/n3main/thumb.png',
                    'dumy' : 'http://placehold.it'
                },
                'root' : '../../..',
                'pcRoot' : '../../../..',
                'live' : 'http://2016.nateimg.co.kr/etc/ui/images',
                arr: ['test1', 'test2']
            },
            prefix: '@@',
            basepath: '@file' //@file : include 경로 상대적 위치,  @root
        }))
        .pipe(gulp.dest(dist + '/html')); // 빌드된 html은 utf-8이며, EUC-KR로 변경 작업이 필요함으로 배포시 변경이 필요하다
});
gulp.task('less_lib', function(){
    return gulp.src(dev + "/less/lib/*")
        .pipe(plumber())
        .pipe(less())
        .pipe(gulp.dest(dist + '/css/lib/'));
});

gulp.task('less', ['less_lib'], function() {
    return gulp.src(dev + '/less/*.less')
        .pipe(plumber())        
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(sourcemaps.write('./map'))
        .pipe(gulp.dest(dist +'/css'))
        .pipe(browserSync.stream());
});

// 서버 테스크 실행 : gulp serve -t [parameter][string]
// ex) gulp serve -t 'special/rio' 
gulp.task('serve', ['default','less', 'html','js', 'copy_frm'], function() {
    browserSync.init({
        directory: true,
        server: '2016/',
        ui: {
            port: 8080,
            weinre: {
                port: 9090
            }
        },
        open: "ui"
    });
    gulp.watch(dist + "/css/*.css",['html']).on('change', browserSync.reload);
    gulp.watch([
        dev + "/js/*.js",
        //dev + "/js/**/*.js"
    ],['js']).on('change', browserSync.reload);
    //gulp.watch(dev + "/doc/inc/*.html",['html']).on('change', browserSync.reload);
    gulp.watch([
        dev + "/doc/**/*.html",
        dev + "/doc/**/**/*.html",
    ],['html']).on('change', browserSync.reload);
    gulp.watch(dev + "/less/**/*.less",['less']).on('change', browserSync.reload);
});

/*-------------------------------------------------
    final Release
-------------------------------------------------*/
gulp.task('concat_css', function() {
    return gulp.src([dist + '/css/common.css', dev + '/css/style.css'])
        .pipe(plumber())
        .pipe(concat('common.css')) // 다른 CSS파일 연결 할 때
        .pipe(gulp.dest(dist + '/css'));
});

gulp.task('css', ['concat_css'], function() {
    return gulp.src(dist + '/css/*')
        .pipe(plumber())
        .pipe(autoprefixer())
        .pipe(csscomb())
        .pipe(cssmin({
            aggressiveMerging  : false, // 속성 병합을 가장 높게 할려면 true
            restructuring : false, // 최적화 수준 가장 높게 설정 할려면 true
            keepBreaks : true
        }))
        .pipe(gulp.dest(trunk + '/css'));
});
// encoding_convert UTF-8 > EUC-KR
gulp.task('convert', function () {
    return gulp.src(dist + '/html/**/*.html')
        .pipe(convertEncoding({to: 'euc-kr'}))
        .pipe(gulp.dest(trunk +'/html'));
});

gulp.task('ifrm_convert', function () {
    return gulp.src(dist + '/html/util/iframe/*')
        .pipe(convertEncoding({to: 'euc-kr'}))
        .pipe(gulp.dest(trunk +'/html/util/iframe'));
});

gulp.task('convert_js', function () {
    return gulp.src(dist + '/js/**/*')
        .pipe(convertEncoding({to: 'euc-kr'}))
        .pipe(gulp.dest(trunk +'/js'));
});
// Resource copy

// JS File, Plug-in copy
gulp.task('copy_js', function() {
    return gulp.src([
            dist + "/js/lib/*",
            //dist + "/js/*.js"
        ])  
        .pipe(cache('copy_js'))
        .pipe(gulpCopy(trunk,{
            prefix: 3 // 폴더 깊이 
        }));
});




gulp.task('build', ['default', 'convert', 'ifrm_convert', 'css', 'convert_js']);