
// usage: log('inside coolFunc', this, arguments);
// paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function(){
  log.history = log.history || [];   // store logs to an array for reference
  log.history.push(arguments);
  arguments.callee = arguments.callee.caller;  
  if(this.console) console.log( Array.prototype.slice.call(arguments) );
};
// make it safe to use console.log always
(function(b){function c(){}for(var d="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","),a;a=d.pop();)b[a]=b[a]||c})(window.console=window.console||{});


// place any jQuery/helper plugins in here, instead of separate, slower script files.

/**
* @preserve Unobtrusive Knockout support library for jQuery
*
* @author Joel Thoms
* @version 1.1
*/

(function($) {

    if (!$ || !$['fn']) throw new Error('jQuery library is required.');

    /**
    * Private method to recursively render key value pairs into a string
    *
    * @param {Object} options Object to render into a string.
    * @return {string} The string value of the object passed in.
    */
    function render(options) {
        var rendered = [];
        for (var key in options) {
            var val = options[key];
            switch (typeof val) {
                case 'string': rendered.push(key + ':' + val); break;
                case 'object': rendered.push(key + ':{' + render(val) + '}'); break;
                case 'function': rendered.push(key + ':' + val.toString()); break;
            }
        }
        return rendered.join(',');
    }

    /**
    * jQuery extension to handle unobtrusive Knockout data binding.
    *
    * @param {Object} options Object to render into a string.
    * @return {Object} A jQuery object.
    */
    $['fn']['dataBind'] = $['fn']['dataBind'] || function(options) {
        return this['each'](function() {
            var opts = $.extend({}, $['fn']['dataBind']['defaults'], options);
            var attr = render(opts);
            if (attr != null && attr != '') {
                $(this)['attr']('data-bind', attr);
            }
        });
    };

    /** this is quite a massive hack 
     it works around the fact that you cannot simply host a template inside a normal element
     since it won't have the text attribute that a script tag does.
     */
    $['fn']['dataBindTemplate'] = $['fn']['dataBindTemplate'] || function () {
      /* don't return anything */
      this['each'](function () {
        var id   = $(this)['attr']('id');
        /* grab the html */
        var html = $(this)['html']();
        /* move the old template to a different id */
        /* todo, do something clever with the template */
        $(this)['attr']('id', id + 'old');
        /* add a new template with the right id */
        $("<script type='text/html' id='" + id + "'>" +
          html + "<\/script>")['appendTo']($("body")[0]);
      });
    };

})(jQuery);
