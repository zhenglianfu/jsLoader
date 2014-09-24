jsPackage
=========

packge manager js, caculate dependce of modules when load a js module

<pre>
// add jquery and jqueryUI module info into PManager controller<br>
<code>
PManger.addModule('jquery', {
  url : '****.js',
  name_space : 'window',
  module : 'jQuery',
  require : [],
  styleList : []
});

PManger.addModule('jqueryUI', {
  url : '****',
  name_space : 'window',
  module : 'jQuery',
  require : ['jquery'],
  styleList : [{href : '***.css'}]
});
</code>
</pre>

<pre>
<code>
// load the jqueryUI, it will load the jquery first, then load the jqueryUI resource<br>
PManger.loadModule('jqueryUI', function(obj, error){
  console.log(obj.jqueryUI, error)
});
</code>
</pre>

