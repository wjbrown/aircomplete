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
        // given a dataset, what is the path to the array?
        // useful when some APIs return {results: []} or {data: []}
        dataKey: '',
        // how many milliseconds should pass after a keystroke before we 
        // repopulate the list
        searchDelay: 200,
        // should the plugin cache ajax requests?
        cache: true,
        // debug for console output
        debug: false
    };

    // The actual plugin constructor
    function Plugin(element, options) {
        this.el = element;

        this.options = $.extend({}, defaults, options);

        this._state = {
            expanded: false,
            count   : 0,
            current : 0
        };

        this._inputw = 0;
        this._inputh = 0;

        this._$wrap = null;
        this._$list = null;

        this._oldHtml = null;

        this._ajaxRequest = null;

        this._results = [];

        this._debounceTimeout = 0;

        this._cache = {};

        this.init();
    }

    Plugin.prototype = {

        init: function() {

            this._oldHtml = $(this.el).clone();

            // get the width/height of the input element
            this._inputw = $(this.el).outerWidth();
            this._inputh = $(this.el).outerHeight();

            // turn off autocomplete for the input
            $(this.el).prop("autocomplete", "off");

            // create outer div wrapper
            var $wrap = $("<div></div>");

            $wrap
                .width(this._inputw)
                .height(this._inputh)
                .addClass("aircomplete");

            $(this.el).wrap($wrap);

            // point the $wrap reference to the DOM object
            this._$wrap = $(this.el).parent();

            // create dropdown list
            var $list = $("<ul class='aircomplete-list'></ul>");

            if (this.options.inheritStyles) {
                $list.css({
                    width:      this._inputw,
                    fontFamily: $(this.el).css("font-family"),
                    fontSize:   $(this.el).css("font-size")
                });
            }

            this._$wrap.append($list);

            // keep ref to the ul
            this._$list = this._$wrap.find("ul:first");

            $(this._$list).on('click.aircomplete', this._onClick);

            $(this.el)
                .on('focus.aircomplete',   this._onFocus.bind(this))
                .on('keydown.aircomplete', this._onKeydown.bind(this))
                .on('keyup.aircomplete',   this._onKeyup.bind(this));

            $(document).on('click.aircomplete', this._onDocumentClick.bind(this));

            $(window).on('resize.aircomplete',  this._onWindowResize.bind(this));
        },

        // Private Methods

        _onDocumentClick: function(e) {
            this._debug('aircomplete._onDocumentClick()');
            if (!$(e.target).hasClass('aircomplete') && !$(e.target).parents('.aircomplete').size()) {
                this._onBlur(e);
            }
        },

        _onWindowResize: function(e) {
            this._debug('aircomplete._onWindowResize()');
            // get the width/height of the input element
            this._inputw = this._$wrap.parent().width();
            // this._inputh = this._$wrap.parent().height();
            this._$wrap
                .width(this._inputw)
                .height(this._inputh);
            this._$list
                .width(this._inputw);
        },

        _onFocus: function(e) {
            this._debug('aircomplete._onFocus()');
            this._$list.show();
        },

        _onBlur: function(e) {
            this._debug('aircomplete._onBlur()');
            this._$list.hide();
        },

        _onKeydown: function(e) {
            this._debug('aircomplete._onKeydown()');
            switch (e.which) {
                case 9: // tab
                    this._onBlur(e);
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

        _onKeyup: function(e) {
            this._debug('aircomplete._onKeyup()');
            e.preventDefault();
            switch (e.which) {
                case 38: // up & down arrows get ignored
                case 40:
                    break;
                case 13: // enter
                    this.selectListItem();
                    break;
                default: // assumed to be input
                    var searchTerm = $(this.el).val();
                    if (searchTerm.length >= this.options.minSearchStringLength) {
                        this._debounce(function() {
                            this._search(searchTerm);
                        }.bind(this), this.options.searchDelay);
                    } else {
                        this.emptyList();
                    }
            }
        },

        _onClick: function(e) {
            this._debug('aircomplete._onClick()');
            if($(e.target).closest('li.aircomplete-list-item')) {
                this._state.current = $(e.target).closest('li.aircomplete-list-item').index() + 1;
            }
            this.selectListItem();
        },

        _debounce: function(func, wait) {

            if (this._debounceTimeout) {
                clearTimeout(this._debounceTimeout);
            }
            
            this._debounceTimeout = setTimeout(func, wait);
        },

        // generic search that delegates down to a more specific search
        _search: function(searchTerm) {
            this._debug('aircomplete.search()');
            // is it an ajax request?
            if (this.options.ajaxOptions.url) {
                this._ajaxSearch(searchTerm);
            }
            // else on-page data set 
            else {
                this._localSearch(searchTerm);
            }
        },

        // for search via ajax
        _ajaxSearch:  function(searchTerm) {
            this._debug('aircomplete.ajaxSearch()');

            var requestUrl = this.options.ajaxOptions.url.replace(
                '{{searchTerm}}', encodeURIComponent(searchTerm)
            );

            // if caching is enabled, check it
            if (this.options.cache) {
                // if we have a cache entry, set the cached request 
                // response to the current data set and run a local search
                if (this._cache.hasOwnProperty(requestUrl)) {
                    this.options.data = this._cache[requestUrl];
                    return this._localSearch(searchTerm);
                }
            }

            // update our ajaxOptions with the request URL
            var ajaxOptions = $.extend({},
                this.options.ajaxOptions, {
                    url: requestUrl
                }
            );

            // if we already have an outstanding ajax request, abort it
            if (this._ajaxRequest) {
                this._ajaxRequest.abort();
            }

            this._ajaxRequest = $.ajax(ajaxOptions);
            this._ajaxRequest.then(function(response) {
                // if cache is enabled, store response in cache
                if (this.options.cache) {
                    this._cache[requestUrl] = response;
                }
                // normalize the response data to a form we can work with
                var data = this._normalizeData(response);
                // filter out unnecessary elements from the dataset
                var results = this._filterResults(data,searchTerm);
                // populate the autocomplete dropdown list
                this._populateList(results, searchTerm);
            }.bind(this));
        },

        // for searching a local dataset / array
        _localSearch: function(searchTerm) {
            this._debug('aircomplete.localSearch()');
            // assign data, check to see if its a fxn
            var rawData = $.isFunction(this.options.data) ? this.options.data() : this.options.data;
            // normalize the rawData to a form we can work with
            var data = this._normalizeData(rawData);
            // filter out unnecessary elements from the dataset
            var results = this._filterResults(data,searchTerm);
            // populate the autocomplete dropdown list
            this._populateList(results, searchTerm);
        },
        
        _normalizeData: function(rawData) {
            var data;
            if (this.options.dataKey !== '' && rawData.hasOwnProperty(this.options.dataKey)) {
                data = rawData[this.options.dataKey];
            }
            else {
                data = rawData;
            }
            return data;
        },

        // given a dataset and a searchTerm, returns dataset with unmatched rows filtered out
        _filterResults: function(dataRows, searchTerm) {
            var results = [];
            for (var i in dataRows) {
                if (this.options.match(dataRows[i], searchTerm)) {
                    results.push(dataRows[i]);
                }
            }
            return results;
        },

        // populates the autocomplete list with the items provided
        _populateList: function(results, searchTerm) {
            this._debug('aircomplete._populateList()');
            this._results = results;
            // if there are results
            if (results.length) {
                this._state.count = results.length;
                var items = "";
                for (var i = 0; i < results.length; i++) {
                    items += "<li class='aircomplete-list-item'>" + this.options.template(results[i], searchTerm) + "</li>";
                }
                this._$list.html(items);
                this.showList();
            } 
            // otherwise
            else {
                this.emptyList();
            }
        },

        // if debug, outputs all function calls
        _debug: function(str) {
            if (this.options.debug) {
                console.log(str);
            }
        },

        // Public Methods

        // focuses the next item in the list
        focusNextListItem: function() {
            this._debug('aircomplete.focusNextListItem()');
            if (this._state.expanded) {
                this._state.current = (this._state.current + 1) % (this._state.count + 1);
                this.focusListItem(this._state.current -1);
            }
        },

        // focuses the previous item in the list
        focusPrevListItem: function() {
            this._debug('aircomplete.focusPrevListItem()');
            if (this._state.expanded) {
                this._state.current = this._state.current === 0 ? this._state.count : this._state.current-1;
                this.focusListItem(this._state.current - 1);
            }
        },

        // highlights the currently focused item in the list
        focusListItem: function(index) {
            this._debug('aircomplete.focusListItem()');
            if (this._state.expanded) {
                this._$list.find("li").removeClass("aircomplete-focused");
                this._$list.find("li:nth(" + index + ")").addClass("aircomplete-focused");
            }
        },

        // 'chooses' the item from the list
        selectListItem: function() {
            this._debug('aircomplete.selectListItem()');
            if (this._state.current) {
                var value = this.options.onSelect(
                    this._results[this._state.current - 1]
                );

                if (value !== false) {
                    this.setInputValue(value);
                    this.emptyList();
                    $(this.el).focus();
                }
            }
        },

        setInputValue: function(value) {
            $(this.el).val(value);
        },

        // shows/expands the autocomplete list
        showList: function() {
            this._debug('aircomplete.showList()');
            this._state.expanded = true;
            this._$list.show();
        },

        // hides/contracts the autocomplete list
        hideList: function() {
            this._debug('aircomplete.hideList()');
            this._state.expanded = false;
            this._$list.hide();
        },
        
        // empties the autocomplete list, resetting the plugin state
        emptyList: function() {
            this._debug('aircomplete.emptyList()');
            this._state = {
                count   : 0,
                current : 0
            };
            this._$list.html("");
            this.hideList();
        },

        destroy: function() {
            // unbind events
            $(this._$list).off('click.aircomplete');
            
            $(this.el)
                .off('focus.aircomplete')
                .off('keydown.aircomplete')
                .off('keyup.aircomplete');

            $(document).off('click.aircomplete');

            $(window).off('resize.aircomplete');

            // undo HTML changes
            this._$wrap.replaceWith(this._oldHtml);
        }
    };

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[pluginName] = function(options) {

        var args = arguments;

        if (typeof options === 'string' && options[0] !== '_' && options !== 'init') {
            // Cache the method call
            // to make it possible
            // to return a value
            var returns;

            this.each(function () {
                var instance = $.data(this, 'plugin_' + pluginName);

                // Tests that there's already a plugin-instance
                // and checks that the requested public method exists
                if (instance instanceof Plugin && typeof instance[options] === 'function') {

                    // Call the method of our plugin instance,
                    // and pass it the supplied arguments.
                    returns = instance[options].apply( instance, Array.prototype.slice.call( args, 1 ) );
                }

                // Allow instances to be destroyed via the 'destroy' method
                if (options === 'destroy') {
                    $.data(this, 'plugin_' + pluginName, null);
                }
            });

            // If the earlier cached method
            // gives a value back return the value,
            // otherwise return this to preserve chainability.
            return returns !== undefined ? returns : this;
        }
        else {
            return this.each(function() {
                if (!$.data(this, "plugin_" + pluginName)) {
                    $.data(this, "plugin_" + pluginName,
                        new Plugin(this, options));
                }
            });
        }
    };

})(jQuery, window, document);
