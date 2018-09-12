/**
 * 
 */

function openMetadataDialog() {
  tinymce.activeEditor.windowManager.open({
    title: 'Edit metadata',
    url: 'js/raje-core/plugin/raje_metadata.html',
    width: 950,
    height: 800,
    onClose: function () {

      if (tinymce.activeEditor.updated_metadata != null) {

        metadata.update(tinymce.activeEditor.updated_metadata)

        tinymce.activeEditor.updated_metadata == null
      }

      tinymce.activeEditor.windowManager.close()
    }
  }, metadata.getAllMetadata())
}

tinymce.PluginManager.add('raje_metadata', function (editor, url) {

  // Add a button that handle the inline element
  editor.addButton('raje_metadata', {
    text: 'Metadata',
    icon: false,
    tooltip: 'Edit metadata',

    // Button behaviour
    onclick: function () {
      openMetadataDialog()
    }
  })

  editor.on('click', function () {
    if ($(tinymce.activeEditor.selection.getNode()).is(HEADER_SELECTOR))
      openMetadataDialog()
  })

  metadata = {

    /**
     * 
     */
    getAllMetadata: function () {

      // Get header from iframe only the first one
      let header = tinymce.activeEditor.$(HEADER_SELECTOR).first()

      // Get all metadata
      let subtitle = header.find('h1.title > small').text()
      let data = {
        subtitle: subtitle,
        title: header.find('h1.title').text().replace(subtitle, ''),
        authors: metadata.getAuthors(header),
        categories: metadata.getCategories(header),
        keywords: metadata.getKeywords(header)
      }

      return data
    },

    /**
     * 
     */
    getAuthors: function (header) {
      let authors = []

      header.find('address.lead.authors').each(function () {

        // Get all affiliations
        let affiliations = []
        $(this).find('span').each(function () {
          affiliations.push($(this).text())
        })

        // push single author
        authors.push({
          name: $(this).children('strong.author_name').text(),
          email: $(this).find('code.email > a').text(),
          affiliations: affiliations
        })
      })

      return authors
    },

    /**
     * 
     */
    getCategories: function (header) {
      let categories = []

      header.find('p.acm_subject_categories > code').each(function () {
        categories.push($(this).text())
      })

      return categories
    },

    /**
     * 
     */
    getKeywords: function (header) {
      let keywords = []

      header.find('ul.list-inline > li > code').each(function () {
        keywords.push($(this).text())
      })

      return keywords
    },

    /**
     * 
     */
    update: function (updatedMetadata) {

      // Remove all meta and links corresponding to metadata in head
      $('head meta[property], head link[property], head meta[name]').remove()

      // Get all current metadata
      let currentMetadata = metadata.getAllMetadata()

      // Update title and subtitle
      if (updatedMetadata.title != currentMetadata.title || updatedMetadata.subtitle != currentMetadata.subtitle) {
        let text = updatedMetadata.title

        if (updatedMetadata.subtitle.trim().length)
          text += ` -- ${updatedMetadata.subtitle}`

        $('title').text(text)
      }

      let affiliationsCache = []

      updatedMetadata.authors.forEach(function (author) {

        $('head').append(`<meta about="mailto:${author.email}" typeof="schema:Person" property="schema:name" name="dc.creator" content="${author.name}">`)
        $('head').append(`<meta about="mailto:${author.email}" property="schema:email" content="${author.email}">`)

        author.affiliations.forEach(function (affiliation) {

          // Look up for already existing affiliation
          let toAdd = true
          let id

          affiliationsCache.forEach(function (affiliationCache) {
            if (affiliationCache.content == affiliation) {
              toAdd = false
              id = affiliationCache.id
            }
          })

          // If there is no existing affiliation, add it
          if (toAdd) {
            let generatedId = `#affiliation_${affiliationsCache.length+1}`
            affiliationsCache.push({
              id: generatedId,
              content: affiliation
            })
            id = generatedId
          }

          $('head').append(`<link about="mailto:${author.email}" property="schema:affiliation" href="${id}">`)
        })
      })

      affiliationsCache.forEach(function (affiliationCache) {
        $('head').append(`<meta about="${affiliationCache.id}" typeof="schema:Organization" property="schema:name" content="${affiliationCache.content}">`)
      })

      updatedMetadata.categories.forEach(function(category){
        $('head').append(`<meta name="dcterms.subject" content="${category}"/>`)
      })

      updatedMetadata.keywords.forEach(function(keyword){
        $('head').append(`<meta property="prism:keyword" content="${keyword}"/>`)
      })

      metadata.addHeaderHTML()
      setNonEditableHeader()

      tinymce.triggerSave()
    },

    /**
     * 
     */
    addHeaderHTML: function () {

      /* Reset header */
      tinymce.activeEditor.$('header').remove()
      tinymce.activeEditor.$('p.keywords').remove()
  
      /* Header title */
      var header = tinymce.activeEditor.$('<header class="page-header container cgen" data-rash-original-content=""></header>')
      tinymce.activeEditor.$(SIDEBAR_ANNOTATION).after(header)

      var title_string = ''
      var title_split = $('head title').html().split(" -- ")
      if (title_split.length == 1) {
        title_string = title_split[0]
      } else {
        title_string = `${title_split[0]}<br /><small>${title_split[1]}</small>`
      }
  
      header.append(`<h1 class="title">${title_string}</h1>`)
      /* /END Header title */
  
      /* Header author */
      var list_of_authors = []
      $('head meta[name="dc.creator"]').each(function () {
        var current_value = $(this).attr('name')
        var current_id = $(this).attr('about')
        var current_name = $(this).attr('content')
        var current_email = $(`head meta[about='${current_id}'][property='schema:email']`).attr('content')
        var current_affiliations = []
        $(`head link[about='${current_id}'][property='schema:affiliation']`).each(function () {
          var cur_affiliation_id = $(this).attr('href')
          current_affiliations.push($(`head meta[about='${cur_affiliation_id}'][property='schema:name']`).attr('content'))
        })
  
        list_of_authors.push({
          "name": current_name,
          "email": current_email,
          "affiliation": current_affiliations
        })
      })
  
      for (var i = 0; i < list_of_authors.length; i++) {
        var author = list_of_authors[i]
        var author_element = $(`<address class="lead authors"></address>`)
        if (author['name'] != null) {
          var name_element_string = `<strong class="author_name">${author.name}</strong> `
          if (author['email'] != null) {
            name_element_string += `<code class="email"><a href="mailto:${author.email}">${author.email}</a></code>`
          }
          author_element.append(name_element_string)
        }
  
        for (var j = 0; j < author.affiliation.length; j++) {
          author_element.append(`<br /><span class="affiliation\">${author.affiliation[j].replace(/\s+/g, " ").replace(/, ?/g, ", ").trim()}</span>`)
        }
        if (i == 0) {
          author_element.insertAfter(tinymce.activeEditor.$("header h1"))
        } else {
          author_element.insertAfter(tinymce.activeEditor.$("header address:last-of-type"))
        }
      }
      /* /END Header author */
  
      /* ACM subjects */
      var categories = $("meta[name='dcterms.subject']")
      if (categories.length > 0) {
        var list_of_categories = $(`<p class="acm_subject_categories"><strong>ACM Subject Categories</strong></p>`)
        categories.each(function () {
          list_of_categories.append(`<br /><code>${$(this).attr("content").split(",").join(", ")}</code>`)
        })
        list_of_categories.appendTo(header)
      }
      /* /END ACM subjects */
  
      /* Keywords */
      var keywords = $('meta[property="prism:keyword"]')
      if (keywords.length > 0) {
        var list_of_keywords = $('<ul class="list-inline"></ul>')
        keywords.each(function () {
          list_of_keywords.append(`<li><code>${$(this).attr("content")}</code></li>`)
        })
        $('<p class="keywords"><strong>Keywords</strong></p>').append(list_of_keywords).appendTo(header)
      }
      /* /END Keywords */
    }
  }

})