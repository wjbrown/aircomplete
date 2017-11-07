/*!
 * aircomplete 1.0
 * http://airtight.io
 * Licensed under the MIT license
 */
// the semi-colon before the function invocation is a safety
// net against concatenated scripts and/or other plugins
// that are not closed properly.
;
(function($, window, document, undefined) {

    // undefined is used here as the undefined global
    // variable in ECMAScript 3 and is mutable (i.e. it can
    // be changed by someone else). undefined isn't really
    // being passed in so we can ensure that its value is
    // truly undefined. In ES5, undefined can no longer be
    // modified.

    // window and document are passed through as local
    // variables rather than as globals, because this (slightly)
    // quickens the resolution process and can be more
    // efficiently minified (especially when both are
    // regularly referenced in your plugin).

    // Create the defaults once
    var pluginName = "aircomplete";

    var defaults = {
        // how elements are matched against search text
        // only applies to non-ajax setup
        match: function(dataRow, searchTerm) {
            return dataRow.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1;
        },
        // how matches are formatted for the dropdown list
        template: function(dataRow, searchTerm) {
            var html = dataRow;
            var searchTerms = searchTerm.trim().split(" ");
            for (var i = 0; i < searchTerms.length; i++) {
                html = html.replace(new RegExp("(" + searchTerms[i] + ")", "igm"), "<strong>$1</strong>");
            }
            return html;
        },
        // defines what should happen if a user selects an item from the list
        // by default, triggered by both click and enter events
        // the value returned from this function will get set as the val() of the input
        // return false to leave the input val() unchanged
        onSelect: function(dataRow) {
            return dataRow.name;
        },
        // should the list inherit styles from the input?
        inheritStyles: true,
        // minimum size of the search text before we start searching
        minSearchStringLength: 3,
        // maybe data is an object, maybe data is a static file
        data: [], // [] | "/path/to/static/file.json"
        // maybe we need to ajax in results
        ajaxOptions: {
            // url: "http://yoursitehere.com/response.json",
            dataType: "json", // or jsonp
            method  : "GET"
        },
        // debug for console output
        // 1 -events only
        // 2  all function calls
        debug: 0
    };

    // The actual plugin constructor
    function Plugin(element, options) {
        this.element = element;

        this.options = $.extend({}, defaults, options);

        this._state = {
            expanded: false,
            count   : 0,
            current : 0
        };

        this._inputw;
        this._inputh;

        this._$wrap;
        this._$list;

        this._ajaxRequest;

        this._results;

        this.init();

    }

    Plugin.prototype = {

        init: function() {
            // get the width/height of the input element
            this._inputw = $(this.element).outerWidth();
            this._inputh = $(this.element).outerHeight();

            // turn off autocomplete for the input
            $(this.element).prop("autocomplete", "off");

            // create outer div wrapper
            var $wrap = $("<div></div>");

            $wrap
                .width(this._inputw)
                .height(this._inputh)
                .addClass("aircomplete");

            $(this.element).wrap($wrap);

            // point the $wrap reference to the DOM object
            this._$wrap = $(this.element).parent();

            // create dropdown list
            var $list = $("<ul class='aircomplete-list'></ul>");

            if (this.options.inheritStyles) {
                $list.css({
                    width: this._inputw,
                    fontFamily: $(this.element).css("font-family"),
                    fontSize: $(this.element).css("font-size")
                });
            }

            this._$wrap.append($list);

            // keep ref to the ul
            this._$list = this._$wrap.find("ul:first");

            $(this._$list)
                .on('click', function(e) {
                    this.onClick(e);
                }.bind(this));

            $(this.element)
                .on('focus',   function(e) { this.onFocus(e);   }.bind(this))
                .on('keydown', function(e) { this.onKeydown(e); }.bind(this))
                .on('keyup',   function(e) { this.onKeyup(e);   }.bind(this));

            $(document)
                .on('click', function(e) {
                    if (!$(e.target).hasClass('aircomplete') && !$(e.target).parents('.aircomplete').size()) {
                    this.onBlur(e);
                }
            }.bind(this));

            $(window)
                .on('resize',  function(e) { this.onResize(e);  }.bind(this));
        },

        onResize: function(e) {
            this.debug('aircomplete.onResize()');
            // get the width/height of the input element
            this._inputw = this._$wrap.parent().width();
            // this._inputh = this._$wrap.parent().height();
            this._$wrap
                .width(this._inputw)
                .height(this._inputh);
            this._$list
                .width(this._inputw);
        },

        onFocus: function(e) {
            this.debug('aircomplete.onFocus()');
            this._$list.show();
        },

        onBlur: function(e) {
            this.debug('aircomplete.onBlur()');
            this._$list.hide();
        },

        onKeydown: function(e) {
            this.debug('aircomplete.onKeydown()');
            switch (e.which) {
                case 9: // tab
                    this.onBlur(e);
                    break;
                case 13: // enter
                    e.preventDefault();
                    break;
                case 38: // up
                    e.preventDefault();
                    this.focusPrevListItem();
                    break;
                case 40: // down
                    e.preventDefault();
                    this.focusNextListItem();
                    break;
            }
        },

        onKeyup: function(e) {
            this.debug('aircomplete.onKeyup()');
            e.preventDefault();
            switch (e.which) {
                case 38: // up & down arrows get ignored
                case 40:
                    break;
                case 13: // enter
                    this.selectListItem();
                    break;
                default: // assumed to be input
                    var term = $(this.element).val();
                    if (term.length >= this.options.minSearchStringLength) {
                        this.search(term);
                    } else {
                        this.emptyList();
                    }
            }
        },

        onClick: function(e) {
            this.debug('aircomplete.onClick()');
            if($(e.target).closest('li.aircomplete-list-item')) {
                this._state.current = $(e.target).closest('li.aircomplete-list-item').index() + 1;
            }
            this.selectListItem();
        },

        // generic search that delegates down to a more specific search
        search: function(term) {
            this.debug('aircomplete.search()');
            // is it an ajax request?
            if (this.options.ajaxOptions.url) {
                this.ajaxSearch(term);
            }
            // else on-page data set 
            else {
                this.localSearch(term);
            }
        },

        // for search via ajax
        ajaxSearch:  function(term) {
            this.debug('aircomplete.ajaxSearch()');
            var ajaxOptions = $.extend({},
                this.options.ajaxOptions, {
                    url: this.options.ajaxOptions.url.replace(
                        '{{term}}', encodeURIComponent(term)
                    )
                }
            );

            // if we already have an outstanding ajax request, abort it
            if (this._ajaxRequest) {
                this._ajaxRequest.abort();
            }

            this._ajaxRequest = $.ajax(ajaxOptions);
            this._ajaxRequest.then(function(results) {
                this.populateList(results.data, term);
            }.bind(this));
        },

        // for searching a local dataset / array
        localSearch: function(term) {
            this.debug('aircomplete.localSearch()');
            // assign data, check to see if its a fxn
            var data = $.isFunction(this.options.data) ? this.options.data() : this.options.data;

            // if its an object, get the array part
            data = $.isPlainObject(data) ? data.data : data;

            var results = [];

            for (var i in data) {
                if (this.options.match(data[i], term)) {
                    results.push(data[i]);
                }
            }

            this.populateList(results, term);
        },

        // focuses the next item in the list
        focusNextListItem: function() {
            this.debug('aircomplete.focusNextListItem()');
            if (this._state.expanded) {
                this._state.current = (this._state.current + 1) % (this._state.count + 1);
                this.focusListItem(this._state.current -1);
            }
        },

        // focuses the previous item in the list
        focusPrevListItem: function() {
            this.debug('aircomplete.focusPrevListItem()');
            if (this._state.expanded) {
                this._state.current = this._state.current === 0 ? this._state.count : this._state.current-1;
                this.focusListItem(this._state.current - 1);
            }
        },

        // highlights the currently focused item in the list
        focusListItem: function(index) {
            this.debug('aircomplete.focusListItem()');
            if (this._state.expanded) {
                this._$list.find("li").removeClass("aircomplete-focused");
                this._$list.find("li:nth(" + index + ")").addClass("aircomplete-focused");
            }
        },

        // 'chooses' the item from the list
        selectListItem: function() {
            this.debug('aircomplete.selectListItem()');
            if (this._state.current) {
                var value = this.options.onSelect(
                    this._results[this._state.current - 1]
                );

                if (value !== false) {
                    this.setInputValue(value);
                    this.emptyList();
                    $(this.element).focus();
                }
            }
        },

        setInputValue: function(value) {
            $(this.element).val(value);
        },

        // shows/expands the autocomplete list
        showList: function() {
            this.debug('aircomplete.showList()');
            this._state.expanded = true;
            this._$list.show();
        },

        // hides/contracts the autocomplete list
        hideList: function() {
            this.debug('aircomplete.hideList()');
            this._state.expanded = false;
            this._$list.hide();
        },

        // populates the autocomplete list with the items provided
        populateList: function(results, term) {
            this.debug('aircomplete.populateList()');
            this._results = results;
            // if there are results
            if (results.length) {
                this._state.count = results.length;
                var items = "";
                for (var i = 0; i < results.length; i++) {
                    items += "<li class='aircomplete-list-item'>" + this.options.template(results[i], term) + "</li>";
                }
                this._$list.html(items);
                this.showList();
            } 
            // otherwise
            else {
                this.emptyList();
            }
        },

        // empties the autocomplete list, resetting the plugin state
        emptyList: function() {
            this.debug('aircomplete.emptyList()');
            this._state = {
                count   : 0,
                current : 0
            };
            this._$list.html("");
            this.hideList();
        },

        // if debug 1, outputs event calls
        // if debug 2, outputs all function calls
        debug: function(str) {
            if (this.options.debug) {
                if (this.options.debug == 2 || str.indexOf('aircomplete.on') !== -1) {
                    console.log(str);
                }
            }
        }
    };

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[pluginName] = function(options) {
        return this.each(function() {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName,
                    new Plugin(this, options));
            }
        });
    };

})(jQuery, window, document);
