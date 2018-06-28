tinymce.PluginManager.add('raje_annotations', function (editor, url) {

  editor.on('click', function (e) {

    let clickedElement = $(e.srcElement)

    if (clickedElement.parents(SIDEBAR_ANNOTATION).length) {

      if (clickedElement.is('span#toggleAnnotations') || clickedElement.parent().is('span#toggleAnnotations'))
        rash.toggleAnnotations()

      if (clickedElement.is('span#toggleSidebar') || clickedElement.parent().is('span#toggleSidebar'))
        rash.toggleSidebar()

      if(clickedElement.is('span[data-rash-annotation-id]'))
        rash.showAnnotation(clickedElement.attr('title').split(','))

      updateIframeFromSavedContent()
    }
  })
})