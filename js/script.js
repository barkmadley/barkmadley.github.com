/* Author: Mark Bradley
*/

/* if a page has an init function defined, run that function once the page has
 * finished loading */
$(function () {
  if (page_init) {
    page_init();
  }
});

