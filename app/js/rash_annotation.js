const replying = 'replying'
const commenting = 'commenting'
const start_role = 'start'
const end_role = 'end'

const raje_string = 'raje'
const rash_string = 'rash'

const active_class = 'active'
const selected_class = 'selected'
const annotation_highlight_class = 'annotation_highlight'
const hidden_class = 'hidden'

const side_note_reply_selector = '.side_note_reply'
const side_note_reply_button_selector = '.side_note_reply_button'

const data_rash_original_content = 'data-rash-original-content'
const data_rash_original_parent_content = 'data-rash-original-parent-content'

const toggle_annotation_selector = '#toggleAnnotations'
const toggle_sidebar_selector = '#toggleSidebar'

class AnnotationContext {

  /**
   * 
   * @param {*} semanticAnnotation 
   */
  constructor(semanticAnnotation) {

    let type

    try {
      type = (tinymce.activeEditor != null) ? raje_string : rash_string
    }

    // Catch ReferenceError thrown by TinyMce if it isn't called
    catch (ReferenceError) {
      type = rash_string
      console.log(ReferenceError)
    }

    switch (type) {

      case raje_string:
        this.annotation = new AnnotationRaje(semanticAnnotation)
        break

      case rash_string:
        this.annotation = new AnnotationRash(semanticAnnotation)
        break
    }
  }

  /**
   * 
   */
  static render() {

    let type

    try {
      type = (tinymce.activeEditor != null) ? raje_string : rash_string
    }

    // Catch ReferenceError thrown by TinyMce if it isn't called
    catch (ReferenceError) {
      type = rash_string
      console.log(ReferenceError)
    }

    switch (type) {

      case raje_string:
        AnnotationRaje.render()
        break

      case rash_string:
        AnnotationRash.render()
        break
    }
  }

  /**
   * 
   * @param {*} container 
   * @param {*} offset 
   * @param {*} path 
   */
  static getOffset(container, offset, path) {

    let type

    try {
      type = (tinymce.activeEditor != null) ? raje_string : rash_string
    }

    // Catch ReferenceError thrown by TinyMce if it isn't called
    catch (ReferenceError) {
      type = rash_string
      console.log(ReferenceError)
    }

    switch (type) {

      case raje_string:

        break

      case rash_string:

        break
    }

    // Execute Raje
    try {
      if (tinymce.activeEditor)
        return AnnotationRaje.getOffset(container, offset, path)
    }

    // Execute Rash
    catch (Exception) {
      return AnnotationRash.getOffset(container, offset, path)
    }
  }

  /**
   * 
   * @param {*} titleAttribute 
   */
  static showAnnotationFromAttribute(titleAttribute) {

    AnnotationContext.toggleAnnotationToolbar()
    titleAttribute = titleAttribute.split(',')

    let type

    try {
      type = (tinymce.activeEditor != null) ? raje_string : rash_string
    }

    // Catch ReferenceError thrown by TinyMce if it isn't called
    catch (ReferenceError) {
      type = rash_string
      console.log(ReferenceError)
    }

    switch (type) {

      case raje_string:
        AnnotationRaje.showAnnotationFromAttribute(titleAttribute)
        break

      case rash_string:
        AnnotationRash.showAnnotationFromAttribute(titleAttribute)
        break
    }
  }

  /**
   * 
   * @param {*} titleAttribute 
   */
  static highlightAnnotationFromAttribute(titleAttribute) {

    titleAttribute = titleAttribute.split(',')

    let type

    try {
      type = (tinymce.activeEditor != null) ? raje_string : rash_string
    }

    // Catch ReferenceError thrown by TinyMce if it isn't called
    catch (ReferenceError) {
      type = rash_string
      console.log(ReferenceError)
    }

    switch (type) {

      case raje_string:
        AnnotationRaje.highlightAnnotationFromAttribute(titleAttribute)
        break

      case rash_string:
        AnnotationRash.highlightAnnotationFromAttribute(titleAttribute)
        break
    }
  }

    /**
   * 
   * @param {*} titleAttribute 
   */
  static NormalizeAnnotationFromAttribute(titleAttribute) {

    titleAttribute = titleAttribute.split(',')

    AnnotationRaje.NormalizeAnnotationFromAttribute(titleAttribute)
  }

  /**
   * 
   */
  static toggleAnnotationToolbar() {

    let type

    try {
      type = (tinymce.activeEditor != null) ? raje_string : rash_string
    }

    // Catch ReferenceError thrown by TinyMce if it isn't called
    catch (ReferenceError) {
      type = rash_string
      console.log(ReferenceError)
    }

    switch (type) {

      case raje_string:
        AnnotationRaje.toggleAnnotationToolbar()
        break

      case rash_string:
        AnnotationRash.toggleAnnotationToolbar()
        break
    }
  }

  /**
   * 
   */
  static toggleAnnotation() {

    let type

    try {
      type = (tinymce.activeEditor != null) ? raje_string : rash_string
    }

    // Catch ReferenceError thrown by TinyMce if it isn't called
    catch (ReferenceError) {
      type = rash_string
      console.log(ReferenceError)
    }

    switch (type) {

      case raje_string:
        AnnotationRaje.toggleAnnotation()
        break

      case rash_string:
        AnnotationRash.toggleAnnotation()
        break
    }
  }

  static renderSingle(id, body) {
    Annotation.renderSingle(id, body)
  }

  static getCssSelector(node) {
    return Annotation.getCssSelector(node)
  }

  static getNextAnnotationId() {
    return Annotation.getNextAnnotationId()
  }

  static clearAnnotations() {

    ANNOTATIONS.forEach(annotation => {
      annotation.remove()
    })

    ANNOTATIONS.clear()
  }
}

class Annotation {

  constructor(semanticAnnotation) {

    //const replaceCssSelector = (selector) => selector.replace('&gt;', '>')

    this.semanticAnnotation = semanticAnnotation
    this.role = semanticAnnotation.Motivation
    this.id = semanticAnnotation.id

    // Save the html elements connected to the annotation
    this.side_note_selector = `.side_note[data-rash-annotation-id="${this.semanticAnnotation.id}"]`
    this.side_note_body_selector = `.side_note_body[data-rash-annotation-id="${this.semanticAnnotation.id}"]`

    this.note_selector = `[data-rash-annotation-id="${this.semanticAnnotation.id}"][data-rash-annotation-type="wrap"]`

    this.start_marker_selector = `span[data-rash-annotation-id="${this.semanticAnnotation.id}"][data-rash-annotation-role="${start_role}"]`
    this.end_marker_selector = `span[data-rash-annotation-id="${this.semanticAnnotation.id}"][data-rash-annotation-role="${end_role}"]`

    switch (this.semanticAnnotation.Motivation) {

      case commenting:
        // Create the starting selector
        this.startSelector = {
          selector: semanticAnnotation.target.selector.startSelector[json_value_key],
          offset: semanticAnnotation.target.selector.start[json_value_key],
          role: start_role
        }

        this.endSelector = {
          selector: semanticAnnotation.target.selector.endSelector[json_value_key],
          offset: semanticAnnotation.target.selector.end[json_value_key],
          role: end_role
        }

        this._addMarker()
        break

      case replying:
        this._addReply()
        break

    }
  }

  _wrapElement(element) {

    element.addClass('annotation_element')
    element.attr('title', this.semanticAnnotation.id)
    element.attr('data-rash-annotation-id', this.semanticAnnotation.id)

    this.start_marker_selector = `.annotation_element[data-rash-annotation-id="${this.semanticAnnotation.id}"]`
    this.end_marker_selector = `.annotation_element[data-rash-annotation-id="${this.semanticAnnotation.id}"]`
  }

  /**
   * 
   */
  _getMarker(role) {
    return $(`<span class="cgen" data-rash-original-content="" data-rash-annotation-role="${role}" data-rash-annotation-id="${this.semanticAnnotation.id}"/>`)
  }

  /**
   * 
   */
  getId() {
    return this.semanticAnnotation.id
  }

  /**
   * 
   */
  getParentAnnotation() {

    if (this.role == replying)
      return ANNOTATIONS.get(this.semanticAnnotation.target)

    else
      return this
  }

  /**
   * 
   */
  getRootAnnotation() {

    let annotation = this

    while (annotation.role == replying)
      annotation = ANNOTATIONS.get(this.semanticAnnotation.target)

    return annotation
  }

  /**
   * 
   */
  static getNextAnnotationId() {

    const suffix = 'annotation_'
    let id = 0

    ANNOTATIONS.forEach(annotation => {
      const annotationId = annotation.id.replace(suffix, '')
      id = id > annotationId ? id : annotationId
    })

    id++

    return `${suffix}${id}`
  }

  /**
   * 
   * @param {*} node 
   */
  static getCssSelector(node) {

    const ending = 'body'

    // The allowed starting elements
    const not_blocked_elements = 'section, p, :header, table, tr, th, td, tbody, ol, ul, li'

    // Create the needed vars
    let parents = []

    if (node.is(not_blocked_elements))
      parents.push(node)

    // Add the entire collection inside the array of parent elements
    node.parentsUntil(ending).each(function () {
      if ($(this).is(not_blocked_elements))
        parents.push($(this))
    })

    let lastParent = parents.pop()
    let cssSelector = `${lastParent[0].nodeName.toLowerCase()}#${lastParent.attr('id')}`

    // Reverse the array in order to have the parents in the left
    parents.reverse()

    // Create the cssSelector for all elements
    for (let element of parents) {

      const nodeName = element[0].nodeName
      cssSelector += ` ${nodeName.toLowerCase()}`

      // In the case that the element has siblings
      if (element.siblings(nodeName).length) {
        cssSelector += `:nth-child(${element.prevAll().length + 1})`
      }
    }

    return cssSelector
  }

  /**
   * 
   * @param {*} id 
   * @param {*} body 
   */
  static renderSingle(id, body) {
    ANNOTATIONS.set(id, new AnnotationContext(body).annotation)
  }
}

class AnnotationRaje extends Annotation {

  /**
   * 
   * @param JSONObject semanticAnnotation 
   */
  constructor(semanticAnnotation) {
    super(semanticAnnotation)
  }
  /**
   * 
   */
  setEvents() {
    this._setClickEvents()
    this._setHoverEvents()
  }

  /**
   * 
   */
  _getAnnotationBody() {

    return `
      <div class="side_note_wrapper">
        <i class="btnRemove glyphicon glyphicon-trash pull-right text-danger"></i>
        <div class="side_node_text">${this.semanticAnnotation.bodyValue}</div>
        <div><a href="#">@${this.semanticAnnotation.creator}</a></div>
        <div class="side_note_date">${new Date(this.semanticAnnotation.created).toUTCString()}</div>
        <div class="side_note_reply container-fluid">
          <div class="row"><textarea rows="3" contenteditable class="form-control"></textarea></div>
          <div class="row"><a class="btn btn-primary btn-xs side_note_reply_button">reply</a></div> 
        </div>
      </div>`
  }

  /**
   * 
   */
  _setClickEvents() {

    const instance = this

    const sideNoteElement = tinymce.activeEditor.$(this.side_note_selector)
    if (sideNoteElement.length) {

      sideNoteElement.off('click')
      sideNoteElement.on('click', function () {
        AnnotationContext.showAnnotationFromAttribute(tinymce.activeEditor.$(instance.side_note_selector).attr('title'))
      })
    }

    const replyElement = tinymce.activeEditor.$(this.side_note_body_selector).find(side_note_reply_selector)

    if (replyElement.length) {

      replyElement.find(side_note_reply_button_selector).off('click')
      replyElement.find(side_note_reply_button_selector).on('click', function () {

        const replayingText = replyElement.find('textarea')[0].value

        const parentAnnotationId = instance.getParentAnnotation().id

        replyElement.find('textarea')[0].value = ''

        createAnnotationReplying(replayingText, parentAnnotationId)
      })
    }

    const removeElement = tinymce.activeEditor.$(this.side_note_body_selector).find('.btnRemove')
    if (removeElement.length) {

      removeElement.off('click')
      removeElement.on('click', function () {

        tinymce.activeEditor.undoManager.transact(function () {

          const parentSideNoteBody = tinymce.activeEditor.$(instance.side_note_body_selector).parents('.side_note_body').last()

          instance.remove()

          parentSideNoteBody.find(side_note_reply_selector).last().addClass(active_class)

          if (instance.semanticAnnotation.Motivation == commenting)
            AnnotationContext.toggleAnnotationToolbar()
        })
      })
    }
  }

  /**
   * 
   */
  _setHoverEvents() {

    const instance = this

    if (tinymce.activeEditor.$(this.side_note_selector).length){
      tinymce.activeEditor.$(this.side_note_selector).on('mouseenter', function () {
        AnnotationContext.highlightAnnotationFromAttribute(tinymce.activeEditor.$(instance.side_note_selector).attr('title'))
      })
      tinymce.activeEditor.$(this.side_note_selector).on('mouseleave', function () {
        AnnotationContext.NormalizeAnnotationFromAttribute(tinymce.activeEditor.$(instance.side_note_selector).attr('title'))
      })
    }

    if (tinymce.activeEditor.$(this.side_note_body_selector).length){
      tinymce.activeEditor.$(this.side_note_body_selector).on('mouseenter', function () {
        AnnotationContext.highlightAnnotationFromAttribute(tinymce.activeEditor.$(instance.side_note_body_selector).attr('data-rash-annotation-id'))
      })
      tinymce.activeEditor.$(this.side_note_body_selector).on('mouseleave', function () {
        AnnotationContext.NormalizeAnnotationFromAttribute(tinymce.activeEditor.$(instance.side_note_body_selector).attr('data-rash-annotation-id'))
      })
    }
  }

  /**
   * 
   */
  _addMarker() {

    // Save the elements
    this.startElement = tinymce.activeEditor.$(this.startSelector.selector)
    this.endElement = tinymce.activeEditor.$(this.endSelector.selector)

    // Check if the annotation wraps entirely a html element
    if (this.startElement[0].isEqualNode(this.endElement[0]) && (this.startSelector.offset == 0 && this.endElement.text().length == this.endSelector.offset))
      this._wrapElement(this.startElement)

    // Else do it normally
    else {
      this._createMarker(this.startElement, this.startSelector)
      this._createMarker(this.endElement, this.endSelector)

      this._fragmentateAnnotation()
    }

    this._createSideAnnotation()

    this.setEvents()

    this._removeMarkers()

    tinymce.triggerSave()
  }

  /**
   * 
   * This function creates and add the marker to the html based on the element (given by the XPATH from the annotation)
   * and the selector which contains both the XPATH selector and the offset
   * 
   * @param JQueryObject element 
   * @param JSONObject selector 
   */
  _createMarker(element, selector) {

    /**
     * 
     * This function creates a range starting in the node at the selected offset, and add the marker with the role
     * 
     * @param textualNode node 
     * @param JSONObject selector 
     * @param Integer offset 
     */
    const _createRangeMarker = (node, selector, offset) => {

      // Create the range and set its start
      const range = new Range()
      range.setStart(node, offset)

      // Insert a node where the range starts
      range.insertNode(this._getMarker(selector.role)[0])

      written = true
    }

    /**
     * 
     * Analyze all the nodes contained inside @param element, keeping all the offsets
     * 
     * @param JQqueryObject element 
     */
    const _analyzeContent = element => {

      // Iterate over all the nodes contained in the element
      for (let node of element.childNodes) {

        // Exit from all loops if 
        if (written)
          break

        // If the node is a html element with text, recursively go deep and analyze its nodes 
        if (node.nodeType !== 3)
          _analyzeContent(node)

        // If the node is a textualNode, do the normal behaviour
        else {

          // Collapse all whitespaces in one
          node.nodeValue = node.nodeValue.replace(/\s+/g, ' ')

          // Store the ending offset of the 
          maxOffset += node.length

          // Add the marker if it has to be added inside the current node
          if (selector.offset >= minOffset && selector.offset <= maxOffset)
            _createRangeMarker(node, selector, selector.offset - minOffset)

          // Update the leftOffset
          minOffset = maxOffset
        }
      }
    }

    // Set variables that are used to iterate over the nodes
    let minOffset = 0
    let maxOffset = 0
    let written = false

    _analyzeContent(element[0])
  }

  /**
   * 
   * Wrap all the nodes between the two markers inside a span
   */
  _fragmentateAnnotation() {

    // Save all the elements that must be wrapped
    let elements = []
    const endMarker = tinymce.activeEditor.$(this.end_marker_selector)[0]

    // Start from the next element of the starting marker and iterate until the endMarker is found
    let next = tinymce.activeEditor.$(this.start_marker_selector)[0].nextSibling
    while (next != null && !next.isEqualNode(endMarker)) {

      // If the element is a node, that containt the marker at any level
      if (next.nodeType != 3 && ($(next).is('tr,th,td') || $(next).find(this.end_marker_selector).length))
        next = next.firstChild

      else {

        // Add the element that must has to be wrapped, inside the array
        elements.push(next)

        // If the next sibling doesn't exist, go up and look at the next element of the parent
        if (next.nextSibling == null) {

          do
            next = next.parentElement

          while (next.nextSibling == null)
        }

        next = next.nextSibling
      }
    }

    let index = 0

    // Wrap all parts of annotations inside a span
    elements.map((node) => {

      // Don't print all elements that are not text or html nodes
      if ((node.nodeType != 1 && node.nodeType != 3)) //|| $(node).is('data-rash-annotation-id'))
        return

      let text = node.nodeType !== 3 ? node.outerHTML : node.nodeValue

      // TODO add the rash-original-content tag
      if (text.trim().length != 0) {

        // If the element is a block element, wrap its content inside a wrapper
        if ($(node).is('p,:header'))
          $(node).html(`<span data-rash-original-parent-content="${text}" data-rash-annotation-index="${++index}" data-rash-annotation-type="wrap" title="#${this.semanticAnnotation.id}" data-rash-annotation-id="${this.semanticAnnotation.id}" class="cgen annotation_highlight">${$(text).html()}</span>`)

        // Or wrap its content in a note
        else
          $(node).replaceWith(`<span data-rash-original-content="${text.replace(/"/g, '&quot;')}" data-rash-annotation-index="${++index}" data-rash-annotation-type="wrap" title="#${this.semanticAnnotation.id}" data-rash-annotation-id="${this.semanticAnnotation.id}" class="cgen annotation_highlight">${text}</span>`)
      }

    })
  }

  /**
   * 
   */
  _createSideAnnotation() {

    /**
     * 
     * @param {*} top 
     */
    const nearAnnotation = (top) => {

      let nearAnnotations = []

      ANNOTATIONS.forEach(annotation => {
        if (Math.abs(top - annotation.top) < 100)
          nearAnnotations.push(annotation)
      })

      return nearAnnotations
    }

    this.coordinates = this._getCoordinates()

    // Get he average distance between the starting and the ending element
    this.top = (this.coordinates.start.top + this.coordinates.end.top) / 2

    let side_note

    // Check if there is another annotation
    let annotation = nearAnnotation(this.top)

    if (annotation.length) {

      annotation = annotation[0]

      side_note = tinymce.activeEditor.$(`span.side_note[data-rash-annotation-id="${annotation.id}"]`)

      side_note.attr('title', `${side_note.attr('title')},${this.semanticAnnotation.id}`)
      side_note.text(parseInt(side_note.text(), 10) + parseInt(1, 10))

      this.top = annotation.top
    }

    // Create a new annotation in this way
    else {

      side_note = $(`<span style="top:${this.top}px" title="${this.semanticAnnotation.id}" data-rash-annotation-id="${this.semanticAnnotation.id}" class="btn btn-default cgen side_note">1</span>`)

      tinymce.activeEditor.$(annotation_sidebar_selector).append(side_note)
    }

    // Create annotation body
    let side_note_body = $(`
      <div style="top:${this.top}px" class="cgen side_note_body" data-rash-annotation-id="${this.semanticAnnotation.id}">${this._getAnnotationBody()}</div>`)

    tinymce.activeEditor.$(annotation_sidebar_selector).append(side_note_body)
  }

  /**
   * 
   */
  _removeMarkers() {

    // Remove markers only if they aren't a wrap (the same element)
    if (this.start_marker_selector != this.end_marker_selector) {
      tinymce.activeEditor.$(this.start_marker_selector).remove()
      tinymce.activeEditor.$(this.end_marker_selector).remove()
    }
  }

  /**
   * 
   */
  _addReply() {

    // Append the new annotation to its parent
    const parentSideNoteBody = tinymce.activeEditor.$(this.getParentAnnotation().side_note_body_selector).first()

    const replyNoteElement = `<div data-rash-annotation-id="${this.semanticAnnotation.id}" class="side_note_body" ><hr/>${this._getAnnotationBody()}`
    parentSideNoteBody.find('.side_note_wrapper').append(replyNoteElement)

    // Remove the reply element from the parent
    parentSideNoteBody.find(side_note_reply_selector).removeClass(active_class)

    // Show the reply element to the new note
    tinymce.activeEditor.$(this.side_note_body_selector).find(side_note_reply_selector).last().addClass(active_class)

    // Update click events
    this._setClickEvents()
  }

  /**
   * 
   */
  _getCoordinates() {

    let startRange = new Range()
    let endRange = new Range()

    startRange.selectNode(tinymce.activeEditor.$(this.start_marker_selector)[0])
    endRange.selectNode(tinymce.activeEditor.$(this.end_marker_selector)[0])

    return {
      start: startRange.getBoundingClientRect(),
      end: endRange.getBoundingClientRect()
    }
  }

  /**
   * 
   */
  remove() {

    // Remove side note elements
    tinymce.activeEditor.$(this.side_note_selector).remove()
    tinymce.activeEditor.$(this.side_note_body_selector).remove()

    // Replace notes with content or parent content
    tinymce.activeEditor.$(this.note_selector).each(function () {

      if ($(this).attr(data_rash_original_content))
        $(this).replaceWith($(this).attr(data_rash_original_content))

      else if ($(this).attr(data_rash_original_parent_content))
        $(this).parent().replaceWith($(this).attr(data_rash_original_parent_content))
    })

    tinymce.activeEditor.$(`script#${this.id}[type="application/ld+json"]`).remove()
  }

  /**
   * 
   */
  hide() {

    tinymce.activeEditor.$(this.side_note_body_selector).removeClass(active_class)

    tinymce.activeEditor.$(this.side_note_selector).toggleClass(hidden_class)
    tinymce.activeEditor.$(this.note_selector).toggleClass(annotation_highlight_class)
  }

  /**
   * 
   */
  static render() {
    tinymce.activeEditor.$(semantic_annotation_selector).each(function () {
      const newNote = new AnnotationContext(JSON.parse($(this).html())).annotation
      ANNOTATIONS.set(newNote.getId(), newNote)
    })
  }

  /**
   * 
   * @param {*} container 
   * @param {*} offset 
   * @param {*} path 
   */
  static getOffset(container, offset, path) {

    /**
     * 
     * Analyze all the nodes contained inside @param element, keeping all the offsets
     * 
     * @param JQqueryObject element 
     */
    const _analyzeContent = node => {

      do {

        if (node.nodeType == 1) {

          // If the element is the svg formula
          if ($(node).is('svg[data-math-original-input]'))
            minOffset += $(node).attr('data-math-original-input').length

          // Or do the normal behaviour
          else
            _analyzeContent(node.firstChild)
        }

        // Act normally if the element is a text node
        else {

          node.nodeValue = node.nodeValue.replace(/\s+/g, ' ')

          if (container.isEqualNode(node)) {
            offset += minOffset
            found = true
          }

          minOffset += node.length
        }

        node = node.nextSibling

        if (found)
          break
      }
      while (node != null)
    }

    let minOffset = 0
    let found = false

    _analyzeContent(tinymce.activeEditor.$(path)[0])

    return offset
  }

  /**
   * 
   */
  static toggleAnnotationToolbar() {
    tinymce.activeEditor.$(annotation_sidebar_selector).toggleClass(active_class)

    ANNOTATIONS.forEach(annotation => {
      tinymce.activeEditor.$(annotation.side_note_body_selector).removeClass(active_class)
      tinymce.activeEditor.$(annotation.side_note_body_selector).find(side_note_reply_selector).removeClass(active_class)
    })
  }

  /**
   * 
   */
  static toggleAnnotation() {

    tinymce.activeEditor.$(annotation_sidebar_selector).removeClass(active_class)
    ANNOTATIONS.forEach(annotation => annotation.hide())
  }

  /**
   * 
   * @param {*} titleAttribute 
   */
  static highlightAnnotationFromAttribute(titleAttribute) {
    for (let id of titleAttribute)
      tinymce.activeEditor.$(ANNOTATIONS.get(id).note_selector).addClass(selected_class)
  }

    /**
   * 
   * @param {*} titleAttribute 
   */
  static NormalizeAnnotationFromAttribute(titleAttribute) {
    for (let id of titleAttribute)
      tinymce.activeEditor.$(ANNOTATIONS.get(id).note_selector).removeClass(selected_class)
  }

  /**
   * 
   * @param {*} titleAttribute 
   */
  static showAnnotationFromAttribute(titleAttribute) {
    for (let id of titleAttribute) {

      const sideNoteBodyElement = tinymce.activeEditor.$(ANNOTATIONS.get(id).side_note_body_selector).first()

      sideNoteBodyElement.toggleClass(active_class)
      sideNoteBodyElement.find(side_note_reply_selector).last().addClass(active_class)
    }
  }
}

class AnnotationRash extends Annotation {

  /**
   * 
   * @param JSONObject semanticAnnotation 
   */
  constructor(semanticAnnotation) {
    super(semanticAnnotation)
  }

  /**
   * 
   */
  setEvents() {
    this._setClickEvents()
    this._setHoverEvents()
  }

  /**
   * 
   */
  _setClickEvents() {

    const instance = this

    const sideNoteElement = $(this.side_note_selector)
    if (sideNoteElement.length) {

      sideNoteElement.off('click')
      sideNoteElement.on('click', function () {
        AnnotationContext.showAnnotationFromAttribute($(instance.side_note_selector).attr('title'))
      })
    }
  }

  /**
   * 
   */
  _getAnnotationBody() {

    return `
      <div class="side_note_wrapper">
        <div class="side_node_text">${this.semanticAnnotation.bodyValue}</div>
        <div><a href="#">@${this.semanticAnnotation.creator}</a></div>
        <div class="side_note_date">${new Date(this.semanticAnnotation.created).toUTCString()}</div>
        <div class="side_note_reply container-fluid">
          <div class="row"><textarea rows="3" contenteditable class="form-control"></textarea></div>
          <div class="row"><a class="btn btn-primary btn-xs side_note_reply_button">reply</a></div> 
        </div>
      </div>`
  }

  /**
   * 
   */
  _setHoverEvents() {

    const instance = this

    if ($(this.side_note_selector).length)
      $(this.side_note_selector).on('mouseenter mouseleave', function () {
        AnnotationContext.highlightAnnotationFromAttribute($(instance.side_note_selector).attr('title'))
      })

    if ($(this.side_note_body_selector).length)
      $(this.side_note_body_selector).on('mouseenter mouseleave', function () {
        AnnotationContext.highlightAnnotationFromAttribute($(instance.side_note_body_selector).attr('data-rash-annotation-id'))
      })
  }

  /**
   * 
   */
  _addMarker() {

    // Save the elements
    this.startElement = $(this.startSelector.selector)
    this.endElement = $(this.endSelector.selector)

    // Check if the annotation wraps entirely a html element
    if (this.startElement[0].isEqualNode(this.endElement[0]) && (this.startSelector.offset == 0 && this.endElement.text().length == this.endSelector.offset))
      this._wrapElement(this.startElement)

    // Else do it normally
    else {
      this._createMarker(this.startElement, this.startSelector)
      this._createMarker(this.endElement, this.endSelector)

      this._fragmentateAnnotation()
    }

    this._createSideAnnotation()

    this.setEvents()

    this._removeMarkers()
  }

  /**
   * 
   */
  /**
   * 
   */
  _addReply() {

    // Append the new annotation to its parent
    const parentSideNoteBody = $(this.getParentAnnotation().side_note_body_selector).first()

    const replyNoteElement = `<div data-rash-annotation-id="${this.semanticAnnotation.id}" class="side_note_body" ><hr/>${this._getAnnotationBody()}`
    parentSideNoteBody.find('.side_note_wrapper').append(replyNoteElement)
  }

  /**
   * 
   * This function creates and add the marker to the html based on the element (given by the XPATH from the annotation)
   * and the selector which contains both the XPATH selector and the offset
   * 
   * @param JQueryObject element 
   * @param JSONObject selector 
   */
  _createMarker(element, selector) {

    /**
     * 
     * This function creates a range starting in the node at the selected offset, and add the marker with the role
     * 
     * @param textualNode node 
     * @param JSONObject selector 
     * @param Integer offset 
     */
    const _createRangeMarker = (node, selector, offset) => {

      // Create the range and set its start
      const range = new Range()
      range.setStart(node, offset)

      // Insert a node where the range starts
      range.insertNode(this._getMarker(selector.role)[0])

      written = true
    }

    /**
     * 
     * Analyze all the nodes contained inside @param element, keeping all the offsets
     * 
     * @param JQqueryObject element 
     */
    const _analyzeContent = element => {

      // Iterate over all the nodes contained in the element
      for (let node of element.childNodes) {

        // Exit from all loops if 
        if (written)
          break

        // If the node is a html element with text, recursively go deep and analyze its nodes 
        if (node.nodeType !== 3)
          _analyzeContent(node)

        // If the node is a textualNode, do the normal behaviour
        else {

          // Collapse all whitespaces in one
          node.nodeValue = node.nodeValue.replace(/\s+/g, ' ')

          // Store the ending offset of the 
          maxOffset += node.length

          // Add the marker if it has to be added inside the current node
          if (selector.offset >= minOffset && selector.offset <= maxOffset)
            _createRangeMarker(node, selector, selector.offset - minOffset)

          // Update the leftOffset
          minOffset = maxOffset
        }
      }
    }

    // Set variables that are used to iterate over the nodes
    let minOffset = 0
    let maxOffset = 0
    let written = false

    _analyzeContent(element[0])
  }

  /**
   * 
   * Wrap all the nodes between the two markers inside a span
   */
  _fragmentateAnnotation() {

    // Save all the elements that must be wrapped
    let elements = []
    const endMarker = $(this.end_marker_selector)[0]

    // Start from the next element of the starting marker and iterate until the endMarker is found
    let next = $(this.start_marker_selector)[0].nextSibling
    while (next != null && !next.isEqualNode(endMarker)) {

      // If the element is a node, that containt the marker at any level
      if (next.nodeType != 3 && ($(next).is('tr,th,td') || $(next).find(this.end_marker_selector).length))
        next = next.firstChild

      else {

        // Add the element that must has to be wrapped, inside the array
        elements.push(next)

        // If the next sibling doesn't exist, go up and look at the next element of the parent
        if (next.nextSibling == null) {

          do
            next = next.parentElement

          while (next.nextSibling == null)
        }

        next = next.nextSibling
      }
    }

    let index = 0

    // Wrap all parts of annotations inside a span
    elements.map((node) => {

      // Don't print all elements that are not text or html nodes
      if ((node.nodeType != 1 && node.nodeType != 3)) //|| $(node).is('data-rash-annotation-id'))
        return

      let text = node.nodeType !== 3 ? node.outerHTML : node.nodeValue

      if (text.trim().length != 0) {

        text = text.replace(/"/g, '\\"')

        // If the element is a block element, wrap its content inside a wrapper
        if ($(node).is('p,:header'))
          $(node).html(`<span data-rash-original-parent-content="${text}" data-rash-annotation-index="${++index}" data-rash-annotation-type="wrap" title="#${this.semanticAnnotation.id}" data-rash-annotation-id="${this.semanticAnnotation.id}" class="cgen annotation_highlight">${$(text).html()}</span>`)

        // Or wrap its content in a note
        else
          $(node).replaceWith(`<span data-rash-original-content="${text.replace(/"/g, '&quot;')}" data-rash-annotation-index="${++index}" data-rash-annotation-type="wrap" title="#${this.semanticAnnotation.id}" data-rash-annotation-id="${this.semanticAnnotation.id}" class="cgen annotation_highlight">${text}</span>`)
      }

    })
  }

  /**
   * 
   */
  _createSideAnnotation() {

    /**
     * 
     * @param {*} top 
     */
    const nearAnnotation = (top) => {

      let nearAnnotations = []

      ANNOTATIONS.forEach(annotation => {
        if (Math.abs(top - annotation.top) < 100)
          nearAnnotations.push(annotation)
      })

      return nearAnnotations
    }

    this.coordinates = this._getCoordinates()

    // Get he average distance between the starting and the ending element
    this.top = (this.coordinates.start.top + this.coordinates.end.top) / 2

    let side_note

    // Check if there is another annotation
    let annotation = nearAnnotation(this.top)

    if (annotation.length) {

      annotation = annotation[0]

      side_note = $(`span.side_note[data-rash-annotation-id="${annotation.id}"]`)

      side_note.attr('title', `${side_note.attr('title')},${this.semanticAnnotation.id}`)
      side_note.text(parseInt(side_note.text(), 10) + parseInt(1, 10))

      this.top = annotation.top
    }

    // Create a new annotation in this way
    else {

      side_note = $(`<span style="top:${this.top}px" title="${this.semanticAnnotation.id}" data-rash-annotation-id="${this.semanticAnnotation.id}" class="btn btn-default cgen side_note">1</span>`)

      $(annotation_sidebar_selector).append(side_note)
    }

    // Create annotation body
    let side_note_body = $(`
      <div style="top:${this.top}px" class="cgen side_note_body" data-rash-annotation-id="${this.semanticAnnotation.id}">${this._getAnnotationBody()}</div>`)

    $(annotation_sidebar_selector).append(side_note_body)
  }

  /**
   * 
   */
  _removeMarkers() {

    // Remove markers only if they aren't a wrap (the same element)
    if (this.start_marker_selector != this.end_marker_selector) {
      $(this.start_marker_selector).remove()
      $(this.end_marker_selector).remove()
    }
  }

  /**
   * 
   */
  remove() {

    // Remove side note elements
    $(this.side_note_selector).remove()
    $(this.side_note_body_selector).remove()

    // Replace notes with content or parent content
    $(this.note_selector).each(function () {

      if ($(this).attr(data_rash_original_content))
        $(this).replaceWith($(this).attr(data_rash_original_content))

      else if ($(this).attr(data_rash_original_parent_content))
        $(this).parent().replaceWith($(this).attr(data_rash_original_parent_content))
    })
  }

  /**
   * 
   */
  hide() {

    $(this.side_note_body_selector).removeClass(active_class)

    $(this.side_note_selector).toggleClass(hidden_class)
    $(this.note_selector).toggleClass(annotation_highlight_class)
  }

  /**
   * 
   * @param {*} start_selector 
   * @param {*} end_selector 
   */
  _getCoordinates() {

    let startRange = new Range()
    let endRange = new Range()

    startRange.selectNode($(this.start_marker_selector)[0])
    endRange.selectNode($(this.end_marker_selector)[0])

    return {
      start: startRange.getBoundingClientRect(),
      end: endRange.getBoundingClientRect()
    }
  }

  /**
   * 
   */
  static render() {
    $(semantic_annotation_selector).each(function () {
      const newNote = new AnnotationContext(JSON.parse($(this).html())).annotation
      ANNOTATIONS.set(newNote.getId(), newNote)
    })
  }

  /**
   * 
   * @param {*} container 
   * @param {*} offset 
   * @param {*} path 
   */
  static getOffset(container, offset, path) {

    /**
     * 
     * Analyze all the nodes contained inside @param element, keeping all the offsets
     * 
     * @param JQqueryObject element 
     */
    const _analyzeContent = element => {

      for (let node of element.childNodes) {

        if (found)
          break

        // If the 
        if (node.nodeType == 1) {

          // If the element is the svg formula
          if ($(node).is('svg[data-math-original-input]'))
            minOffset += $(node).attr('data-math-original-input').length

          // Or do the normal behaviour
          else
            _analyzeContent(node)
        }

        // Act normally if the element is a text node
        else {

          node.nodeValue = node.nodeValue.replace(/\s+/g, ' ')

          if (container.isEqualNode(node)) {
            offset += minOffset
            found = true
          }

          minOffset += node.length
        }
      }
    }

    let minOffset = 0
    let found = false

    _analyzeContent($(path)[0])

    return offset
  }

  /**
   * 
   */
  static toggleAnnotationToolbar() {
    $(annotation_sidebar_selector).toggleClass(active_class)

    ANNOTATIONS.forEach(annotation => {
      $(annotation.side_note_body_selector).removeClass(active_class)
      $(annotation.side_note_body_selector).find(side_note_reply_selector).removeClass(active_class)
    })
  }

  /**
   * 
   */
  static toggleAnnotation() {

    $(annotation_sidebar_selector).removeClass(active_class)
    ANNOTATIONS.forEach(annotation => annotation.hide())
  }

  /**
   * 
   * @param {*} titleAttribute 
   */
  static highlightAnnotationFromAttribute(titleAttribute) {
    for (let id of titleAttribute)
      $(ANNOTATIONS.get(id).note_selector).toggleClass(selected_class)
  }

  /**
   * 
   * @param {*} titleAttribute 
   */
  static showAnnotationFromAttribute(titleAttribute) {
    for (let id of titleAttribute) {

      const sideNoteBodyElement = $(ANNOTATIONS.get(id).side_note_body_selector).first()

      sideNoteBodyElement.toggleClass(active_class)
    }
  }

  static initEvents() {

    $(toggle_annotation_selector).on('click', function () {
      AnnotationContext.toggleAnnotation()
    })

    $(toggle_sidebar_selector).on('click', function () {
      AnnotationContext.toggleAnnotationToolbar()
    })
  }
}