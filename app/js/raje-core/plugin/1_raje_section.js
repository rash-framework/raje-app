/**
 * RASH section plugin RAJE
 */

tinymce.PluginManager.add('raje_section', function (editor) {

  // Add the button to select the section
  editor.addButton('raje_section', {
    type: 'menubutton',
    text: HEADINGS_BUTTONLIST_LABEL,
    title: 'heading',
    icons: false,

    // Sections sub menu
    menu: [{
      text: `${HEADING_BUTTON_LABEL}1.`,
      onclick: function (e) {
        section.addOrDownUpgrade(e, 1)
      }
    }, {
      text: `${HEADING_BUTTON_LABEL}1.1.`,
      onclick: function (e) {
        section.addOrDownUpgrade(e, 2)
      }
    }, {
      text: `${HEADING_BUTTON_LABEL}1.1.1.`,
      onclick: function (e) {
        section.addOrDownUpgrade(e, 3)
      }
    }, {
      text: `${HEADING_BUTTON_LABEL}1.1.1.1.`,
      onclick: function (e) {
        section.addOrDownUpgrade(e, 4)
      }
    }, {
      text: `${HEADING_BUTTON_LABEL}1.1.1.1.1.`,
      onclick: function (e) {
        section.addOrDownUpgrade(e, 5)
      }
    }, {
      text: `${HEADING_BUTTON_LABEL}1.1.1.1.1.1.`,
      onclick: function (e) {
        section.addOrDownUpgrade(e, 6)
      }
    }, {
      text: SPECIAL_BUTTON_LABEL,
      menu: [{
          text: ABSTRACT_BUTTON_LABEL,
          onclick: function () {

            section.addAbstract()
          }
        },
        {
          text: ACKNOWLEDGEMENTS_BUTTON_LABEL,
          onclick: function () {
            section.addAcknowledgements()
          }
        },
        {
          text: REFERENCES_BUTTON_LABEL,
          onclick: function () {
            section.handleAddBliblioentry()
          }
        }
      ]
    }]
  })

  editor.on('keyDown', function (e) {

    // instance of the selected element
    let selectedElement = $(tinymce.activeEditor.selection.getNode())
    let selection = tinymce.activeEditor.selection

    let startNode = $(selection.getRng().startContainer)
    let endNode = $(selection.getRng().endContainer)

    // Check if the caret is inside a section
    if ((section.cursorInSection(selection) || section.cursorInSpecialSection(selection))) {

      // Block special chars in special elements
      if (checkIfSpecialChar(e.keyCode) &&
        (startNode.parents(SPECIAL_SECTION_SELECTOR).length || endNode.parents(SPECIAL_SECTION_SELECTOR).length) &&
        (startNode.parents(H1).length > 0 || endNode.parents(H1).length > 0)) {

        e.stopImmediatePropagation()
        return false
      }

      /**
       * Check if BACKSPACE or CANC are pressed
       */
      if (e.keyCode == 8 || e.keyCode == 46) {

        // If the section isn't collapsed
        if (!tinymce.activeEditor.selection.isCollapsed()) {

          // If the selection contains at least a biblioentry
          if (selectionContent.containsBiblioentries(selection)) {

            e.stopImmediatePropagation()

            // Both delete event and update are stored in a single undo level
            tinymce.activeEditor.undoManager.transact(function () {

              tinymce.activeEditor.execCommand(DELETE_CMD)
              section.updateBibliographySection()
              updateReferences()

              tinymce.triggerSave()
            })

            return false
          }

          // If the selection contains the entire bibliography section
          if (selectionContent.containsBibliography(selection)) {

            e.stopImmediatePropagation()

            tinymce.activeEditor.undoManager.transact(function () {

              // Execute normal delete
              tinymce.activeEditor.$(BIBLIOGRAPHY_SELECTOR).remove()
              updateReferences()

              tinymce.triggerSave()
            })

            return false
          }

          // Restructure the entire body if the section isn't collapsed and not inside a special section
          if (!section.cursorInSpecialSection(selection)) {
            e.stopImmediatePropagation()
            section.manageDelete()
            tinymce.triggerSave()
            return false
          }
        }

        // If the section is collapsed
        if (tinymce.activeEditor.selection.isCollapsed()) {

          // If the selection is inside a special section
          if (section.cursorInSpecialSection(selection)) {

            // Remove special section if the cursor is at the beginning
            if ((startNode.parents(H1).length || startNode.is(H1)) && tinymce.activeEditor.selection.getRng().startOffset == 0) {

              e.stopImmediatePropagation()
              section.deleteSpecialSection(selectedElement)
              return false
            }

            // if the cursor is at the beginning of a empty p inside its biblioentry, remove it and update the references
            if (selectionContent.isAtBeginningOfEmptyBiblioentry(selection)) {

              e.stopImmediatePropagation()

              tinymce.activeEditor.undoManager.transact(function () {

                // Execute normal delete
                tinymce.activeEditor.execCommand(DELETE_CMD)
                updateReferences()

                tinymce.triggerSave()
              })

              return false
            }

            // if the cursor is at the beginning of the first empty p inside a footnote, remove it and update the references
            if (selectionContent.isAtBeginningOfEmptyEndnote(selection)) {

              e.stopImmediatePropagation()

              tinymce.activeEditor.undoManager.transact(function () {

                let endnote = selectedElement.parents(ENDNOTE_SELECTOR)

                // If the current endnote is the last one remove the entire footnotes section
                if (!endnote.prev(ENDNOTE_SELECTOR).length && !endnote.next(ENDNOTE_SELECTOR).length)
                  $(ENDNOTES_SELECTOR).remove()

                else
                  tinymce.activeEditor.execCommand(DELETE_CMD)


                updateReferences()

                tinymce.triggerSave()
              })

              return false
            }
          }
        }

        // Prevent remove from header
        if (selectedElement.is(NON_EDITABLE_HEADER_SELECTOR) ||
          (selectedElement.attr('data-mce-caret') == 'after' && selectedElement.parent().is(RAJE_SELECTOR)) ||
          (selectedElement.attr('data-mce-caret') && selectedElement.parent().is(RAJE_SELECTOR)) == 'before')
          return false
      }

      /**
       * Check if ENTER is pressed
       */
      if (e.keyCode == 13) {

        // When enter is pressed inside an header, not at the end of it
        if (cursor.isInsideHeading(selection)) {
          e.stopImmediatePropagation()
          section.addWithEnter()
          return false
        }

        // If selection is before/after header
        if (selectedElement.is('p')) {

          // Block enter before header
          if (selectedElement.attr('data-mce-caret') == 'before') {
            e.stopImmediatePropagation()
            return false
          }


          // Add new section after header
          if (selectedElement.attr('data-mce-caret') == 'after') {
            e.stopImmediatePropagation()
            section.add(1)
            return false
          }
        }

        // If enter is pressed inside bibliography selector
        if (selectedElement.parents(BIBLIOGRAPHY_SELECTOR).length) {

          let id = getSuccessiveElementId(BIBLIOENTRY_SELECTOR, BIBLIOENTRY_SUFFIX)

          // Pressing enter in h1 will add a new biblioentry and caret reposition
          if (selectedElement.is(H1)) {

            section.addBiblioentry(id)
            tinymce.triggerSave()
          }

          // If selected element is inside text
          else if (selectedElement.is('p'))
            section.addBiblioentry(id, null, selectedElement.parent('li'))

          // If selected element is without text
          else if (selectedElement.is('li'))
            section.addBiblioentry(id, null, selectedElement)

          // Move caret #105
          tinymce.activeEditor.selection.setCursorLocation(tinymce.activeEditor.dom.select(`${BIBLIOENTRY_SELECTOR}#${id} > p`)[0], false)
          return false
        }

        // Adding sections with shortcuts #
        if (selectedElement.is('p') && selectedElement.text().trim().substring(0, 1) == '#') {

          let level = section.getLevelFromHash(selectedElement.text().trim())
          let deepness = $(selectedElement).parentsUntil(RAJE_SELECTOR).length - level + 1

          // Insert section only if caret is inside abstract section, and user is going to insert a sub section
          // OR the cursor isn't inside other special sections
          // AND selectedElement isn't inside a figure
          if (((selectedElement.parents(ABSTRACT_SELECTOR).length && deepness > 0) || !selectedElement.parents(SPECIAL_SECTION_SELECTOR).length) && !selectedElement.parents(FIGURE_SELECTOR).length) {

            section.add(level, selectedElement.text().substring(level).trim())
            return false
          }
        }
      }
    }
  })

  editor.on('NodeChange', function (e) {
    section.updateSectionToolbar()
  })
})

section = {

  /**
   * Function called when a new section needs to be attached, with buttons
   */
  add: (level, text) => {

    // Select current node
    let selectedElement = $(tinymce.activeEditor.selection.getNode())

    // Create the section
    let newSection = section.create(text != null ? text : selectedElement.html().trim(), level)

    tinymce.activeEditor.undoManager.transact(function () {

      // Check what kind of section needs to be inserted
      if (section.manageSection(selectedElement, newSection, level ? level : selectedElement.parentsUntil(RAJE_SELECTOR).length)) {

        // Remove the selected section
        selectedElement.remove()

        // If the new heading has text nodes, the offset won't be 0 (as normal) but instead it'll be length of node text
        moveCaret(newSection.find(':header').first()[0])

        tinymce.triggerSave()
      }
    })
  },

  /**
   * 
   */
  addOrDownUpgrade: (e, level) => {

    let selectedMenuItem = $(e.target).parent('.mce-menu-item')

    // Upgrade the header selected from iframe
    if (selectedMenuItem.attr(DATA_UPGRADE))
      return this.upgrade()

    // Downgrade the header selected from iframe
    if (selectedMenuItem.attr(DATA_DOWNGRADE))
      return this.downgrade()

    // Transform the paragraph selected from iframe
    return this.add(level)
  },

  /**
   * Function called when a new section needs to be attached, with buttons
   */
  addWithEnter: function () {

    // Select current node
    let selectedElement = $(tinymce.activeEditor.selection.getNode())

    // If the section isn't special
    if (!selectedElement.parent().attr('role')) {

      level = selectedElement.parentsUntil(RAJE_SELECTOR).length

      // Create the section
      let newSection = this.create(selectedElement.text().trim().substring(tinymce.activeEditor.selection.getRng().startOffset), level)

      tinymce.activeEditor.undoManager.transact(function () {

        // Check what kind of section needs to be inserted
        section.manageSection(selectedElement, newSection, level)

        // Remove the selected section
        selectedElement.html(selectedElement.text().trim().substring(0, tinymce.activeEditor.selection.getRng().startOffset))

        moveCaret(newSection.find(':header').first()[0], true)

        tinymce.triggerSave()
      })
    } else
      notify('Error, headers of special sections (abstract, acknowledments) cannot be splitted', 'error', 4000)
  },

  /**
   * Get the last inserted id
   */
  getNextId: function () {
    let id = 0
    tinymce.activeEditor.$('section[id]').each(function () {
      if ($(this).attr('id').indexOf('section') > -1) {
        let currId = parseInt($(this).attr('id').replace('section', ''))
        id = id > currId ? id : currId
      }
    })
    return `section${id+1}`
  },

  /**
   * Retrieve and then remove every successive elements 
   */
  getSuccessiveElements: function (element, deepness) {

    let successiveElements = $('<div></div>')

    while (deepness >= 0) {

      if (element.nextAll(':not(.footer)')) {

        // If the deepness is 0, only paragraph are saved (not sections)
        if (deepness == 0) {
          // Successive elements can be p or figures
          successiveElements.append(element.nextAll(`p,${FIGURE_SELECTOR}`))
          element.nextAll().remove(`p,${FIGURE_SELECTOR}`)
        } else {
          successiveElements.append(element.nextAll())
          element.nextAll().remove()
        }
      }

      element = element.parent('section')
      deepness--
    }

    return $(successiveElements.html())
  },

  /**
   * 
   */
  getLevelFromHash: function (text) {

    let level = 0
    text = text.substring(0, text.length >= 6 ? 6 : text.length)

    while (text.length > 0) {

      if (text.substring(text.length - 1) == '#')
        level++

      text = text.substring(0, text.length - 1)
    }

    return level
  },

  /**
   * Return JQeury object that represent the section
   */
  create: function (text, level) {

    // Trim white spaces and add zero_space char if nothing is inside
    if (typeof text != "undefined") {
      text = text.trim()
      if (text.length == 0)
        text = "<br>"
    } else
      text = "<br>"

    return $(`<section id="${this.getNextId()}"><h${level} data-rash-original-wrapper="h1">${text}</h${level}></section>`)
  },

  /**
   * Check what kind of section needs to be added, and preceed
   */
  manageSection: function (selectedElement, newSection, level) {

    let deepness = $(selectedElement).parentsUntil('body').length - level + 1

    if (deepness >= 0) {

      // Block insert selection if caret is inside special section, and user is going to insert a sub section
      if ((selectedElement.parents(SPECIAL_SECTION_SELECTOR).length && deepness != 1) || (selectedElement.parents(ACKNOWLEDGEMENTS_SELECTOR).length &&
          selectedElement.parents(BIBLIOGRAPHY_SELECTOR) &&
          selectedElement.parents(ENDNOTES_SELECTOR)))
        return false

      // Get direct parent and ancestor reference
      let successiveElements = this.getSuccessiveElements(selectedElement, deepness)

      if (successiveElements.length)
        newSection.append(successiveElements)

      // CASE: sub section
      if (deepness == 0)
        selectedElement.after(newSection)

      // CASE: sibling section
      else if (deepness == 1)
        selectedElement.parent('section').after(newSection)

      // CASE: ancestor section at any uplevel
      else
        $(selectedElement.parents('section')[deepness - 1]).after(newSection)

      headingDimension()

      return true
    }
  },

  /**
   * 
   */
  upgrade: function () {

    let selectedElement = $(tinymce.activeEditor.selection.getNode())

    if (selectedElement.is(':header')) {

      // Get the references of selected and parent section
      let selectedSection = selectedElement.parent(SECTION_SELECTOR)
      let parentSection = selectedSection.parent(SECTION_SELECTOR)

      // If there is a parent section, the upgrade is allowed
      if (parentSection.length) {

        // Everything in here, is an atomic undo level
        tinymce.activeEditor.undoManager.transact(function () {

          // Save the section and detach
          let bodySection = $(selectedSection[0].outerHTML)
          selectedSection.detach()

          // Update dimension and move the section out
          parentSection.after(bodySection)

          tinymce.triggerSave()
          headingDimension()
        })
      }

      // Notify error
      else
        notify(HEADING_TRASFORMATION_FORBIDDEN, 'error', 2000)
    }
  },

  /**
   * 
   */
  downgrade: function () {

    let selectedElement = $(tinymce.activeEditor.selection.getNode())

    if (selectedElement.is('h1,h2,h3,h4,h5,h6')) {
      // Get the references of selected and sibling section
      let selectedSection = selectedElement.parent(SECTION_SELECTOR)
      let siblingSection = selectedSection.prev(SECTION_SELECTOR)

      // If there is a previous sibling section downgrade is allowed
      if (siblingSection.length) {

        // Everything in here, is an atomic undo level
        tinymce.activeEditor.undoManager.transact(function () {

          // Save the section and detach
          let bodySection = $(selectedSection[0].outerHTML)
          selectedSection.detach()

          // Update dimension and move the section out
          siblingSection.append(bodySection)

          // Refresh tinymce content and set the heading dimension
          headingDimension()
        })
      }
    }

    // Notify error
    else
      notify(HEADING_TRASFORMATION_FORBIDDEN, 'error', 2000)
  },

  /**
   * 
   */
  addAbstract: function () {

    if (!tinymce.activeEditor.$(ABSTRACT_SELECTOR).length) {

      tinymce.activeEditor.undoManager.transact(function () {

        // This section can only be placed after non editable header
        tinymce.activeEditor.$(NON_EDITABLE_HEADER_SELECTOR).after(`<section id="doc-abstract" role="doc-abstract"><h1>Abstract</h1></section>`)
      })
    }

    //move caret and set focus to active aditor #105
    moveCaret(tinymce.activeEditor.dom.select(`${ABSTRACT_SELECTOR} > h1`)[0])
    scrollTo(ABSTRACT_SELECTOR)
  },

  /**
   * 
   */
  addAcknowledgements: function () {

    if (!tinymce.activeEditor.$(ACKNOWLEDGEMENTS_SELECTOR).length) {

      let ack = $(`<section id="doc-acknowledgements" role="doc-acknowledgements"><h1>Acknowledgements</h1></section>`)

      tinymce.activeEditor.undoManager.transact(function () {

        // Insert this section after last non special section 
        // OR after abstract section 
        // OR after non editable header
        if (tinymce.activeEditor.$(MAIN_SECTION_SELECTOR).length)
          tinymce.activeEditor.$(MAIN_SECTION_SELECTOR).last().after(ack)

        else if (tinymce.activeEditor.$(ABSTRACT_SELECTOR).length)
          tinymce.activeEditor.$(ABSTRACT_SELECTOR).after(ack)

        else
          tinymce.activeEditor.$(NON_EDITABLE_HEADER_SELECTOR).after(ack)
      })
    }

    //move caret and set focus to active aditor #105
    moveCaret(tinymce.activeEditor.dom.select(`${ACKNOWLEDGEMENTS_SELECTOR} > h1`)[0])
    scrollTo(ACKNOWLEDGEMENTS_SELECTOR)
  },

  handleAddBliblioentry: function () {

    // Only if bibliography section doesn't exists
    if (!tinymce.activeEditor.$(BIBLIOGRAPHY_SELECTOR).length) {

      tinymce.activeEditor.undoManager.transact(function () {

        // Add new biblioentry
        section.addBiblioentry()

        //move caret and set focus to active aditor #105
        tinymce.activeEditor.selection.select(tinymce.activeEditor.dom.select(`${BIBLIOENTRY_SELECTOR}:last-child`)[0], true)
      })
    } else
      tinymce.activeEditor.selection.select(tinymce.activeEditor.dom.select(`${BIBLIOGRAPHY_SELECTOR}>h1`)[0])

    scrollTo(`${BIBLIOENTRY_SELECTOR}:last-child`)
    tinymce.triggerSave()
    tinymce.activeEditor.focus()
  },

  /**
   * This method is the main one. It's called because all times the intent is to add a new biblioentry (single reference)
   * Then it checks if is necessary to add the entire <section> or only the missing <ul>
   */
  addBiblioentry: function (id, text, listItem) {

    // Add bibliography section if not exists
    if (!tinymce.activeEditor.$(BIBLIOGRAPHY_SELECTOR).length) {

      let bibliography = $(`<section id="doc-bibliography" role="doc-bibliography"><h1>References</h1><ul></ul></section>`)

      // This section is added after acknowledgements section
      // OR after last non special section
      // OR after abstract section
      // OR after non editable header 
      if (tinymce.activeEditor.$(ACKNOWLEDGEMENTS_SELECTOR).length)
        tinymce.activeEditor.$(ACKNOWLEDGEMENTS_SELECTOR).after(bibliography)

      else if (tinymce.activeEditor.$(MAIN_SECTION_SELECTOR).length)
        tinymce.activeEditor.$(MAIN_SECTION_SELECTOR).last().after(bibliography)

      else if (tinymce.activeEditor.$(ABSTRACT_SELECTOR).length)
        tinymce.activeEditor.$(ABSTRACT_SELECTOR).after(bibliography)

      else
        tinymce.activeEditor.$(NON_EDITABLE_HEADER_SELECTOR).after(bibliography)

    }

    // Add ul in bibliography section if not exists
    if (!tinymce.activeEditor.$(BIBLIOGRAPHY_SELECTOR).find('ul').length)
      tinymce.activeEditor.$(BIBLIOGRAPHY_SELECTOR).append('<ul></ul>')

    // IF id and text aren't passed as parameters, these can be retrieved or init from here
    id = (id) ? id : getSuccessiveElementId(BIBLIOENTRY_SELECTOR, BIBLIOENTRY_SUFFIX)
    text = text ? text : '<br/>'

    let newItem = $(`<li role="doc-biblioentry" id="${id}"><p>${text}</p></li>`)

    // Append new li to ul at last position
    // OR insert the new li right after the current one
    if (!listItem)
      tinymce.activeEditor.$(`${BIBLIOGRAPHY_SELECTOR} ul`).append(newItem)

    else
      listItem.after(newItem)
  },

  /**
   * 
   */
  updateBibliographySection: function () {

    // Remove all sections without p child
    tinymce.activeEditor.$(`${BIBLIOENTRY_SELECTOR}:not(:has(p))`).each(function () {
      $(this).remove()
    })
  },

  /**
   * 
   */
  addEndnote: function (id) {

    // Add the section if it not exists
    if (!tinymce.activeEditor.$(ENDNOTE_SELECTOR).length) {

      let endnotes = tinymce.activeEditor.$(`<section id="doc-endnotes" role="doc-endnotes"><h1 data-rash-original-content="">Footnotes</h1></section>`)

      // Insert this section after bibliography section
      // OR after acknowledgements section
      // OR after non special section selector
      // OR after abstract section
      // OR after non editable header 
      if (tinymce.activeEditor.$(BIBLIOGRAPHY_SELECTOR).length)
        tinymce.activeEditor.$(BIBLIOGRAPHY_SELECTOR).after(endnotes)

      else if (tinymce.activeEditor.$(ACKNOWLEDGEMENTS_SELECTOR).length)
        tinymce.activeEditor.$(ACKNOWLEDGEMENTS_SELECTOR).after(endnotes)

      else if (tinymce.activeEditor.$(MAIN_SECTION_SELECTOR).length)
        tinymce.activeEditor.$(MAIN_SECTION_SELECTOR).last().after(endnotes)

      else if (tinymce.activeEditor.$(ABSTRACT_SELECTOR).length)
        tinymce.activeEditor.$(ABSTRACT_SELECTOR).after(endnotes)

      else
        tinymce.activeEditor.$(NON_EDITABLE_HEADER_SELECTOR).after(endnotes)
    }

    // Create and append the new endnote
    let endnote = tinymce.activeEditor.$(`<section role="doc-endnote" id="${id}"><p><br/></p></section>`)
    tinymce.activeEditor.$(ENDNOTES_SELECTOR).append(endnote)
  },

  /**
   * 
   */
  updateSectionToolbar: function () {

    // Dropdown menu reference
    let menu = $(MENU_SELECTOR)

    if (menu.length) {
      section.restoreSectionToolbar(menu)

      // Save current selected element
      let selectedElement = $(tinymce.activeEditor.selection.getRng().startContainer)

      if (selectedElement[0].nodeType == 3)
        selectedElement = selectedElement.parent()

      // If current element is p
      if (selectedElement.is('p') || selectedElement.parent().is('p')) {

        // Check if caret is inside special section
        // In this case enable only first menuitem if caret is in abstract
        if (selectedElement.parents(SPECIAL_SECTION_SELECTOR).length) {

          if (selectedElement.parents(ABSTRACT_SELECTOR).length)
            menu.children(`:lt(1)`).removeClass('mce-disabled')

          return false
        }

        // Get deepness of the section
        let deepness = selectedElement.parents(SECTION_SELECTOR).length + 1

        // Remove disabling class on first {deepness} menu items
        menu.children(`:lt(${deepness})`).removeClass('mce-disabled')

        // Get the section list and update the dropdown with the right texts
        let list = section.getAncestorSectionsList(selectedElement)
        for (let i = 0; i <= list.length; i++) {
          menu.children(`:eq(${i})`).find('span.mce-text').text(list[i])
        }
      }

      // Enable only for upgrade/downgrade
      else if (!selectedElement.parents(SPECIAL_SECTION_SELECTOR).length && selectedElement.is('h1,h2,h3')) {

        // Get the selected section
        let selectedSection = selectedElement.parents(SECTION_SELECTOR).first()

        // Get the number of the heading (eg. H1 => 1, H2 => 2)
        let index = parseInt(selectedElement.prop('tagName').toLowerCase().replace('h', ''))

        // Get the deepness of the section (eg. 1 if is a main section, 2 if is a subsection)
        let deepness = selectedElement.parents(SECTION_SELECTOR).length

        // Get the list of texts that are bee
        let list = section.getAncestorSectionsList(selectedElement)

        // The text index in list
        let i = deepness - index

        // Check if the current section has a previous section 
        // In this case the upgrade is permitted
        if (selectedSection.prev().is(SECTION_SELECTOR)) {

          // menu item inside the dropdown
          let menuItem = menu.children(`:eq(${index})`)

          let tmp = list[index].replace(HEADING_BUTTON_LABEL, '')
          tmp = tmp.split('.')
          tmp[index - 1] = parseInt(tmp[index - 1]) - 1

          let text = HEADING_BUTTON_LABEL + tmp.join('.')

          menuItem.find('span.mce-text').text(text)
          menuItem.removeClass('mce-disabled')
          menuItem.attr(DATA_DOWNGRADE, true)
        }

        // Check if the current section has a parent
        // In this case the upgrade is permitted
        if (selectedSection.parent(SECTION_SELECTOR).length) {

          index = index - 2

          // menu item inside the dropdown
          let menuItem = menu.children(`:eq(${index})`)
          menuItem.find('span.mce-text').text(list[index])
          menuItem.removeClass('mce-disabled')
          menuItem.attr(DATA_UPGRADE, true)
        }
      }

      // Disable in any other cases
      else
        menu.children(':gt(10)').addClass('mce-disabled')
    }
  },

  /**
   * 
   */
  getAncestorSectionsList: function (selectedElement) {

    let preHeaders = []
    let list = []
    let parentSections = selectedElement.parents('section')

    // Save index of all parent sections
    for (let i = parentSections.length; i > 0; i--) {
      let elem = $(parentSections[i - 1])
      let index = elem.parent().children(SECTION_SELECTOR).index(elem) + 1
      preHeaders.push(index)
    }

    // Update text of all menu item
    for (let i = 0; i <= preHeaders.length; i++) {

      let text = HEADING_BUTTON_LABEL

      // Update text based on section structure
      if (i != preHeaders.length) {
        for (let x = 0; x <= i; x++)
          text += `${preHeaders[x] + (x == i ? 1 : 0)}.`
      }

      // In this case raje changes text of next sub heading
      else {
        for (let x = 0; x < i; x++)
          text += `${preHeaders[x]}.`

        text += '1.'
      }

      list.push(text)
    }

    return list
  },

  /**
   * Restore normal text in section toolbar and disable all
   */
  restoreSectionToolbar: function (menu) {

    let cnt = 1

    menu.children(':lt(6)').each(function () {
      let text = HEADING_BUTTON_LABEL

      for (let i = 0; i < cnt; i++)
        text += `1.`

      // Remove data elements
      $(this).removeAttr(DATA_UPGRADE)
      $(this).removeAttr(DATA_DOWNGRADE)

      $(this).find('span.mce-text').text(text)
      $(this).addClass('mce-disabled')

      cnt++
    })

    // Enable upgrade/downgrade last three menu items
    menu.children(':gt(10)').removeClass('mce-disabled')
  },

  /**
   * 
   */
  manageDelete: function () {

    let selectedContent = tinymce.activeEditor.selection.getContent()

    // If the selected content has HTML inside
    if (selectedContent.indexOf('<') > -1) {

      selectedContent = $(selectedContent)
      let hasSection = false
      // Check if one of the selected element is a section
      selectedContent.each(function () {
        if ($(this).is(SECTION_SELECTOR))
          return hasSection = true
      })

      // If the selected content has a section inside, then manage delete
      if (hasSection) {

        let range = tinymce.activeEditor.selection.getRng()
        let startNode = $(range.startContainer).parent()
        let endNode = $(range.endContainer).parent()
        let commonAncestorContainer = $(range.commonAncestorContainer)

        // Deepness is relative to the common ancestor container of the range startContainer and end
        let deepness = endNode.parent('section').parentsUntil(commonAncestorContainer).length + 1
        let currentElement = endNode
        let toMoveElements = []

        tinymce.activeEditor.undoManager.transact(function () {

          // Get and detach all next_end
          for (let i = 0; i <= deepness; i++) {
            currentElement.nextAll('section,p,figure,pre,ul,ol,blockquote').each(function () {
              toMoveElements.push($(this))

              $(this).detach()
            })
            currentElement = currentElement.parent()
          }

          // Execute delete
          tinymce.activeEditor.execCommand(DELETE_CMD)

          // Detach all next_begin
          startNode.nextAll().each(function () {
            $(this).detach()
          })

          // Append all next_end to startnode parent
          toMoveElements.forEach(function (element) {
            startNode.parent('section').append(element)
          })

          // Refresh headings
          headingDimension()

          // Update references if needed
          updateReferences()
        })
      }
    }
  },

  /**
   * 
   */
  deleteSpecialSection: function (selectedElement) {

    tinymce.activeEditor.undoManager.transact(function () {

      // Remove the section and update 
      selectedElement.parent(SPECIAL_SECTION_SELECTOR).remove()

      // Update references
      updateReferences()

      tinymce.triggerSave()
    })
  },

  /**
   * 
   */
  cursorInSection: function (selection) {

    return $(selection.getNode()).is(SECTION_SELECTOR) || Boolean($(selection.getNode()).parents(SECTION_SELECTOR).length)
  },

  /**
   * 
   */
  cursorInSpecialSection: function (selection) {

    return $(selection.getNode()).is(SPECIAL_SECTION_SELECTOR) ||
      Boolean($(selection.getRng().startContainer).parents(SPECIAL_SECTION_SELECTOR).length) ||
      Boolean($(selection.getRng().endContainer).parents(SPECIAL_SECTION_SELECTOR).length)
  }
}