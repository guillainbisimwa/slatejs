//= require ../lib/_jquery.highlight
(function() {
   'use strict';
   var content, searchResults;
   var highlightOpts = { element: 'span', className: 'search-highlight' };
   function populate() {
      $('h1, h2').each(function() {
         var title = $(this);
         var body = title.nextUntil('h1, h2');
         index.add({
            id:    title.prop('id'),
            title: title.text(),
            body:  body.text()
            });
         });
      }
   function bind() {
      content = $('.content');
      searchResults = $('.search-results');
      $('#input-search').on('keyup', search);
      }
   function highlight() {
      if (this.value)
         content.highlight(this.value, highlightOpts);
      }
   function unhighlight() {
      content.unhighlight(highlightOpts);
      }
   function search(event) {
      unhighlight();
      searchResults.addClass('visible');
      if (event.keyCode === 27)  //ESC key clears the field
         this.value = '';
      function displayResult(index, result) {
         var elem = document.getElementById(result.ref);
         searchResults.append('<li><a href=#' + result.ref + '>' + $(elem).text() + '</a></li>');
         }
      if (this.value) {
         var results = index.search(this.value).filter(function(r) { return r.score > 0.0001; });
         if (results.length) {
            searchResults.empty();
            $.each(results, displayResult);
            highlight.call(this);
            }
         else {
            searchResults.html('<li></li>');
            $('.search-results li').text('No Results Found for "' + this.value + '"');
            }
         }
      else {
         unhighlight();
         searchResults.removeClass('visible');
         }
      }
   var index = new lunr.Index();
   index.ref('id');
   index.field('title', { boost: 10 });
   index.field('body');
   index.pipeline.add(lunr.trimmer, lunr.stopWordFilter);
   $(populate);
   $(bind);
})();
