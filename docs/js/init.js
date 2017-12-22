var above_folder = $('#above_folding')
var title_wrapper = above_folder.find('.wrapper')
var call_to_action = above_folder.find('.call_to_action')

/**
 * 
 */
function setAboveFolderHeigth() {
  above_folder.css("min-height", window.innerHeight)
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

  call_to_action.on('click', function () {
    window.scroll({
      top: window.innerHeight,
      left: 0,
      behavior: 'smooth'
    });
  })
})