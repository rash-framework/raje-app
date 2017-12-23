var above_folder = $('#above_folding')
var discover = $('#discover')
var technical_overview = $('#technical_overview')
var title_wrapper = above_folder.find('.wrapper')
var to_discover = above_folder.find('#to_discover')

/**
 * 
 */
function setAboveFolderHeigth() {
  above_folder.css('min-height', window.innerHeight)
  discover.css('min-height', window.innerHeight)
  technical_overview.css('min-height', window.innerHeight)
}

/**
 * 
 */
function centerTitleWrapper() {
  title_wrapper.center()
}

/**
 * 
 */
jQuery.fn.center = function () {
  this.css({
    position: 'relative',
    top: (this.parent().height() - this.outerHeight()) * .75 + this.parent().scrollTop() + "px",
    left: (this.parent().width() - this.outerWidth()) / 2 + this.parent().scrollLeft() + "px"
  })
}

/**
 * 
 */
$(window).on('resize', function () {
  setAboveFolderHeigth()
})

/**
 * 
 */
$(document).ready(function () {
  setAboveFolderHeigth()
  centerTitleWrapper()

  to_discover.on('click', function (e) {
    e.preventDefault()
    window.scroll({
      top: window.innerHeight,
      left: 0,
      behavior: 'smooth'
    });
  })
})