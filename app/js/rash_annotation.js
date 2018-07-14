const replying = 'replying'
const commenting = 'commenting'

/**
 * 
 */
class Annotation {

  /**
   * 
   * @param {*} semanticAnnotation 
   */
  constructor(semanticAnnotation) {

    this.semanticAnnotation = semanticAnnotation

    switch (this.semanticAnnotation.Motivation) {

      case commenting:
        // Create the starting selector
        this.startSelector = {
          selector: semanticAnnotation.target.selector.startSelector[json_value_key],
          offset: semanticAnnotation.target.selector.start[json_value_key],
          role: 'start'
        }

        this.endSelector = {
          selector: semanticAnnotation.target.selector.endSelector[json_value_key],
          offset: semanticAnnotation.target.selector.end[json_value_key],
          role: 'end'
        }

        this._addMarker()
        break

      case replying:
        this._addReply()
        break

    }
  }

  /**
   * 
   */
  _getMarker(role) {
    return `<span class="cgen" data-rash-original-content="" data-rash-annotation-role="${role}" data-rash-annotation-id="${this.semanticAnnotation.id}"/>`
  }

  /**
   * 
   */
  _getMarkerSelector(role) {
    return `span[data-rash-annotation-id="${this.semanticAnnotation.id}"][data-rash-annotation-role="${role}"]`
  }

  /**
   * 
   */
  _getAnnotationBody() {
    return `
      <p>
        ${this.semanticAnnotation.bodyValue}<br/>
        <a href="#">@${this.semanticAnnotation.creator}</a><br/>
        <span class="side_node_date">${new Date(this.semanticAnnotation.created).toUTCString().replace(':00 GMT','')}</span>
      </p>`
  }

  /**
   * 
   */
  _addMarker() {

    // Save the elements
    this.startElement = $(document).xpath(this.startSelector.selector)
    this.endElement = $(document).xpath(this.endSelector.selector)

    // Check if the annotation wraps entirely a html element
    if (this.startElement.is(this.endElement) && (this.startSelector.offset == 0 && this.endElement.text().length == this.endSelector.offset))
      return this._wrapElement(this.startElement)

    this._createMarker(this.startElement, this.startSelector)
    this._createMarker(this.endElement, this.endSelector)

    this._fragmentateAnnotation()
  }

  /**
   * 
   */
  _addReply() {

    this.startElement = $(`${annotation_sidebar_selector} div[data-rash-annotation-id='${this.semanticAnnotation.target}']`)

    if (!this.startElement.parent().is(annotation_sidebar_selector))
      this.startElement.parentsUntil(annotation_sidebar_selector)

    if (this.startElement.children('ul').length == 0)
      this.startElement.append($('<ul></ul>'))

    this.startElement.children('ul').append(`<div data-rash-annotation-id="${this.semanticAnnotation.id}" ><hr/>${this._getAnnotationBody()}</li>`)
  }

  /**
   * 
   * @param {*} element 
   */
  _wrapElement(element) {

    element.addClass('annotation_element')
    element.attr('title', this.semanticAnnotation.id)
    element.attr('data-rash-annotation-id', this.semanticAnnotation.id)

    this._createSideAnnotation(element)
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
      range.insertNode($(this._getMarker(selector.role))[0])

      return false
    }

    /**
     * 
     * Analyze all the nodes contained inside @param element, keeping all the offsets
     * 
     * @param JQqueryObject element 
     */
    const _analyzeContent = element => {

      // Iterate over all the nodes contained in the element
      element.contents().each(function () {

        // Get the element in vanilla js
        let node = this

        // If the node is a html element, recursively go deep and analyze its nodes
        if (node.nodeType !== 3)
          return _analyzeContent($(node))

        // If the node is a textualNode, do the normal behaviour
        else {

          // Collapse all whitespaces in one
          node.nodeValue = node.nodeValue.replace(/\s+/g, ' ')

          // Store the ending offset of the 
          maxOffset += node.length

          // Add the marker if it has to be added inside the current node
          if (selector.offset >= minOffset && selector.offset <= maxOffset)
            return _createRangeMarker(node, selector, selector.offset - minOffset)

          // Update the leftOffset
          minOffset = maxOffset
        }
      })
    }

    // Set variables that are used to iterate over the nodes
    let minOffset = 0
    let maxOffset = 0

    _analyzeContent(element)
  }

  /**
   * 
   * Wrap all the nodes between the two markers inside a span
   */
  _fragmentateAnnotation() {

    // Save the markers
    let startMarker = $(this._getMarkerSelector(this.startSelector.role))[0]
    let endMarker = $(this._getMarkerSelector(this.endSelector.role))[0]

    // Save all the elements that must be wrapped
    let elements = []

    // Start from the next element of the starting marker and iterate until the endMarker is found
    let next = startMarker.nextSibling
    while (next != null && next != endMarker) {

      // If the element is a node, that containt the marker at any level
      if (next.nodeType != 3 && ($(next).is('tr,th,td') || $(next).find(endMarker).length > 0))
        next = next.firstChild

      else {

        // Add the element that must has to be wrapped, inside the array
        elements.push(next)

        // If the next sibling doesn't exist, go up and look at the next element of the parent
        if (next.nextSibling == null)
          next = next.parentElement.nextSibling

        // Otherwise preceed normally
        else
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
          $(node).html(`<span data-rash-original-parent-content="${text}" data-rash-annotation-index="${++index}" data-rash-annotation-type="wrap" title="#${this.semanticAnnotation.id}" data-rash-annotation-id="${this.semanticAnnotation.id}" class="cgen annotation_hilight">${$(text).html()}</span>`)

        // Or wrap its content in a note
        else
          $(node).replaceWith(`<span data-rash-original-content="${text}" data-rash-annotation-index="${++index}" data-rash-annotation-type="wrap" title="#${this.semanticAnnotation.id}" data-rash-annotation-id="${this.semanticAnnotation.id}" class="cgen annotation_hilight">${text}</span>`)
      }

    })

    // Create the side annotation passing the distance of the height
    this._createSideAnnotation(startMarker)

    // Remove the starting and ending markers
    $(startMarker).remove()
    $(endMarker).remove()
  }

  /**
   * 
   */
  _createSideAnnotation(element) {

    const getWrapAnnotationSelector = id => `span.cgen.annotation_hilight[data-rash-annotation-id="${id}"]`

    /**
     * 
     * @param {*} top 
     */
    const nearAnnotation = (top) => {
      for (let annotation of ANNOTATIONS)
        if (Math.abs(top - annotation.top) < 100)
          return annotation
    }

    // Get the distance from the top of the document
    this.top = $(element).offset().top - 25

    let sideAnnotation

    // Check if there is another annotation
    let annotation = nearAnnotation(this.top)
    if (typeof annotation != 'undefined') {

      sideAnnotation = $(`span.side_note[data-rash-annotation-id="${annotation.semanticAnnotation.id}"]`)

      sideAnnotation.attr('title', `${sideAnnotation.attr('title')},${this.semanticAnnotation.id}`)
      sideAnnotation.text(1 + parseInt(sideAnnotation.text()))

      this.top = annotation.top
    }

    // Create a new annotation in this way
    else {

      const height = $(element).height()

      sideAnnotation = $(`<span style="top:${this.top}px" title="${this.semanticAnnotation.id}" data-rash-annotation-id="${this.semanticAnnotation.id}" class="btn btn-default cgen side_note">1</span>`)

      $(annotation_sidebar_selector).append(sideAnnotation)
    }

    const referencedNotes = sideAnnotation.attr('title').split(',')

    // Remove the previous hover function
    sideAnnotation.unbind('mouseenter mouseleave click')

    // Add the new hover function
    sideAnnotation.on('mouseenter mouseleave', function () {

      let selector = getWrapAnnotationSelector(referencedNotes[0])

      for (let i = 1; i < referencedNotes.length; i++)
        selector += `,${getWrapAnnotationSelector(referencedNotes[i])}`

      $(selector).each(function () {
        $(this).toggleClass('selected')
      })
    })

    sideAnnotation.on('click', function () {
      rash.showAnnotation(referencedNotes)
    })

    // Create annotation body
    const sideAnnotationBody = $(`
      <div style="top:${this.top}px" class="cgen side_note_body" data-rash-annotation-id="${this.semanticAnnotation.id}">${this._getAnnotationBody()}</div>`)

    sideAnnotationBody.on('mouseenter mouseleave', function () {
      $(getWrapAnnotationSelector($(this).attr('data-rash-annotation-id'))).each(function () {
        $(this).toggleClass('selected')
      })
    })

    $(annotation_sidebar_selector).append(sideAnnotationBody)
  }

  /**
   * 
   */
  remove() {
    $(`span[data-rash-annotation-id="${this.semanticAnnotation.id}"][data-rash-original-content]`).each(function () {
      $(this).replaceWith($(this).attr('data-rash-original-content'))
    })

    $(`span[data-rash-annotation-id="${this.semanticAnnotation.id}"][data-rash-original-parent-content]`).each(function () {
      $(this).parent().replaceWith($(this).attr('data-rash-original-parent-content'))
    })
  }

  /**
   * 
   */
  static getXPath(node) {

    // The allowed starting elements
    const blocked_elements = 'p, :header'

    // Create the neede vars
    let xpath = '/'
    let parents = []

    if (node.is(blocked_elements))
      parents.push(node)

    // Add the entire collection inside the array of parent elements
    node.parentsUntil('body').each(function () {
      parents.push($(this))
    })

    // Reverse the array in order to have the parents in the left
    parents.reverse()

    // Create the Xpath for all elements
    for (let element of parents)
      xpath += `/${element[0].nodeName.toLowerCase()}[${element.prev(element[0].nodeName).length + 1}]`


    return xpath
  }

  /**
   * 
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

        // If the 
        if (node.nodeType == 1)
          _analyzeContent(node)

        else {

          node.nodeValue = node.nodeValue.replace(/\s+/g, ' ')

          if (container.isEqualNode(node)) {
            offset += minOffset
            break
          }

          minOffset += node.length
        }
      }
    }

    let minOffset = 0

    _analyzeContent($(document).xpath(path)[0])

    return offset
  }

  /**
   * 
   */
  static getLastAnnotation() {

    const annotation_prefix = 'annotation_'
    let lastId = 0
    let lastAnnotation = $('head').children().last()

    $(semantic_annotation_selector).each(function () {
      let currentId = parseInt($(this).attr('id').replace(annotation_prefix, ''))

      if (currentId > lastId) {
        lastId = currentId
        lastAnnotation = $(`${semantic_annotation_selector}#${annotation_prefix + lastId}`)
      }
    })

    return {
      id: annotation_prefix + (lastId + 1),
      element: lastAnnotation
    }
  }
}