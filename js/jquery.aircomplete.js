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
    var pluginName = "aircomplete",
        defaults = {
            // how elements are matched against search text
            match: function(data, term) {
                return data.toLowerCase().indexOf(term.toLowerCase()) > -1;
                //return true;
            },
            // how matches are returned for the dropdown list
            template: function(data, term) {
                var text = data;
                var terms = term.trim().split(' ');
                for (var i = 0; i < terms.length; i++) {
                    text = text.replace(new RegExp('(' + terms[i] + ')', 'igm'), "<strong>$1</strong>")
                }
                return text;
                // return "<div><img src='" + element.img + "' style='width:50px;' />" + element.name + "</div>";
            },
            // callback for user pressing eter on a selection
            onEnter: function(data) {
                return;
            },
            // should the list inherit styles from the input?
            inheritStyles: true,
            // minimum size of the search text before we start searching
            minSearchStringLength: 3,
            // maybe data is an object, maybe data is a static file
            data: [], // [] | '/path/to/static/file.json'
            // maybe we need to ajax in results
            ajaxOptions: {
                // url: 'http://yoursitehere.com/response.json',
                dataType: 'json', // or jsonp
                method: 'GET'
            }
        };

    // The actual plugin constructor
    function Plugin(element, options) {
        this.element = element;

        // jQuery has an extend method that merges the
        // contents of two or more objects, storing the
        // result in the first object. The first object
        // is generally empty because we don't want to alter
        // the default options for future instances of the plugin
        this.options = $.extend({}, defaults, options);

        this._defaults = defaults;
        this._name = pluginName;

        this._state = {
            focused: false,
            expanded: false,
            count: 0,
            current: 0
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
            // call them like so: this.yourOtherFunction(this.element, this.options).

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

            if (this.options['inheritStyles']) {
                $list.css({
                    width: this._inputw,
                    fontFamily: $(this.element).css("font-family"),
                    fontSize: $(this.element).css("font-size")
                });
            }

            this._$wrap.append($list);

            this._$list = this._$wrap.find("ul:first");

            $(this._$list)
                .on('click', function(e) {
                    this.onClick(e)
                }.bind(this));

            $(this.element)
                .on('focus', function(e) {
                    this.onFocus(e)
                }.bind(this))
                .on('blur', function(e) {
                    this.onBlur(e)
                }.bind(this))
                .on('keydown', function(e) {
                    this.onKeydown(e)
                }.bind(this))
                .on('keyup', function(e) {
                    this.onKeyup(e)
                }.bind(this));

            $('body').on('click', function(e) {
                if (this._$wrap.has($(e.target))) {
                    this._state.focused = true;
                    this._$list.show();
                } else {
                    this._state.focused = false;
                    this._$list.hide();
                }
            }.bind(this));

        },

        onFocus: function(e) {
            if ($.isFunction(this.options.data)) {
                var data = this.options.data();
            } else {
                var data = this.options.data;
            }
            if (typeof data == 'string') {
                $.ajax({
                    url: data,
                    success: function(result) {
                        data = result;
                    },
                    dataType: 'json',
                    async: false
                });
            }

            this._state.focused = true;
            this._$list.show();
        },

        onBlur: function(e) {

        },

        onKeydown: function(e) {
            switch (e.which) {
                case 13: // enter
                    e.preventDefault();
                    break;
                case 38: // up
                    e.preventDefault();
                    if (this._state.expanded) {
                        this._state.current = Math.max(this._state.current - 1, 0);

                        this._$list.find("li").removeClass("aircomplete-selected");
                        if (this._state.current) {
                            this._$list.find("li:nth(" + (this._state.current - 1) + ")").addClass("aircomplete-selected");
                        }
                    }
                    break;
                case 40: // down
                    e.preventDefault();
                    if (this._state.expanded) {
                        this._state.current = Math.min(this._state.current + 1, this._state.count);

                        this._$list.find("li").removeClass("aircomplete-selected");
                        this._$list.find("li:nth(" + (this._state.current - 1) + ")").addClass("aircomplete-selected");
                    }
                    break;
            }
        },

        onKeyup: function(e) {
            e.preventDefault();

            switch (e.which) {
                case 38: // up & down arrows get ignored
                case 40:
                    break;
                case 13: // enter
                    if (this._state.current) {

                        var proceed = this.options.onEnter(
                            this._results[this._state.current - 1]
                        );

                        if (proceed) {
                            $(this.element).val(
                                this._$list.find("li:nth(" + (this._state.current - 1) + ")").text()
                            );
                            this._$list.html("");
                            this._state.current = 0;
                            this._state.count = 0;
                        }
                    }
                    break;
                default: // assumed to be input
                    //this._$list.html("");
                    this._state.current = 0;
                    this._state.count = 0;
                    const term = $(this.element).val();
                    if (term.length >= this.options.minSearchStringLength) {
                        this.search(term);
                    }
            }
        },

        onClick: function(e) {
            if($(e.target).closest('li.aircomplete-list-item')) {
                this._state.current = $(e.target).closest('li.aircomplete-list-item').index()+1;

                this._$list.find("li").removeClass("aircomplete-selected");
                this._$list.find("li:nth(" + (this._state.current - 1) + ")").addClass("aircomplete-selected");
            }

            if (this._state.current) {
                var proceed = this.options.onClick(
                    this._results[this._state.current - 1]
                );

                if (proceed) {
                    $(this.element).val(
                        this._$list.find("li:nth(" + (this._state.current - 1) + ")").text()
                    );
                    this._$list.html("");
                    this._state.current = 0;
                    this._state.count = 0;
                }
            } else {
                console.log(e.target);
            }
        },

        search: function(term) {
            // is it an ajax request?
            if (this.options.ajaxOptions.url) {
                var ajaxOptions = $.extend({},
                    this.options.ajaxOptions, {
                        url: this.options.ajaxOptions.url.replace(
                            '{{term}}', encodeURIComponent(term)
                        )
                    }
                );

                if (this._ajaxRequest) {
                    this._ajaxRequest.abort();
                }

                this._ajaxRequest = $.ajax(ajaxOptions);
                this._ajaxRequest.then(function(results) {
                    this.options.data = results;
                    this.updateResults(results, term);
                }.bind(this));
                // is it a function?
            } else if ($.isFunction(this.options.data)) {
                var results = [];
                var data = this.options.data();

                for (var i in data) {
                    if (this.options.match(data[i], term)) {
                        results.push(data[i]);
                    }
                }

                this.updateResults(results, term);
                // default - static json
            } else {
                var results = [];

                for (var i in this.options.data) {
                    if (this.options.match(this.options.data[i], term)) {
                        results.push(this.options.data[i]);
                    }
                }

                this.updateResults(results, term);
            }
        },

        updateResults: function(results, term) {
            if (results.length) {
                this._state.expanded = true;
                this._state.count = results.length;
                var items = "";
                for (var i = 0; i < results.length; i++) {
                    items += "<li class='aircomplete-list-item'>" + this.options.template(results[i], term) + "</li>";
                }
                this._$list.html(items);
            } else {
                this._state.expanded = false;
                this._state.count = false;
                this._state.current = 0;
            }

            this._results = results;
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
