function sortedKeys(obj) {
    'use strict';

    var keys = [];
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            keys.push(key);
        }
    }
    return keys.sort();
}

angular.module('rt.select2', [])
    .value('select2Config', {})
    .directive('select2', function ($rootScope, $timeout, $parse, select2Config) {
    'use strict';

    var options = {};
                           //0000111110000000000022220000000000000000000000333300000000000000444444444444444000000000555555555555555000000066666666666666600000000000000007777000000000000000000088888
    var NG_OPTIONS_REGEXP = /^\s*(.*?)(?:\s+as\s+(.*?))?(?:\s+group\s+by\s+(.*))?\s+for\s+(?:([\$\w][\$\w]*)|(?:\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)))\s+in\s+(.*?)(?:\s+track\s+by\s+(.*?))?$/;

    if (select2Config) {
        angular.extend(options, select2Config);
    }

    return {
        require: 'ngModel',
        priority: 1,
        restrict: 'E',
        template: '<input type="hidden"></input>',
        replace: true,
        link: function (scope, element, attrs, controller) {
            var getSelection;
            var getOptions;

            var opts = angular.extend({}, options, scope.$eval(attrs.options));
            var isMultiple = angular.isDefined(attrs.multiple) || opts.multiple;

            opts.multiple = isMultiple;

            if (attrs.placeholder) {
                opts.placeholder = attrs.placeholder;
            }

            var modelFn = $parse(attrs.ngModel);

            if (attrs.ngOptions) {
                var match;
                if (!(match = attrs.ngOptions.match(NG_OPTIONS_REGEXP))) {
                    throw new Error("Invalid ngOptions encountered!");
                }

                var displayFn = $parse(match[2] || match[1]);
                var valuesFn = $parse(match[7]);
                var valueName = match[4] || match[6];
                var valueFn = $parse(match[2] ? match[1] : valueName);
                var keyName = match[5];

                getOptions = function (callback) {
                    var values = valuesFn(scope);
                    var keys = (keyName ? sortedKeys(values) : values) || [];

                    var options = [];
                    for (var i = 0; i < keys.length; i++) {
                        var locals = {};
                        var key = i;
                        if (keyName) {
                            key = keys[i];
                            locals[keyName] = key;
                        }
                        locals[valueName] = values[key];

                        var value = valueFn(scope, locals);
                        var label = displayFn(scope, locals) || "";

                        options.push({
                            id: value,
                            text: label
                        });
                    }

                    callback(options);
                };

                opts.query = function (query) {
                    var values = valuesFn(scope);
                    var keys = (keyName ? sortedKeys(values) : values) || [];

                    var options = [];
                    for (var i = 0; i < keys.length; i++) {
                        var locals = {};
                        var key = i;
                        if (keyName) {
                            key = keys[i];
                            locals[keyName] = key;
                        }
                        locals[valueName] = values[key];

                        var value = valueFn(scope, locals);
                        var label = displayFn(scope, locals) || "";

                        if (label.toLowerCase().indexOf(query.term.toLowerCase()) > -1) {
                            options.push({
                                id: value,
                                text: label
                            });
                        }
                    }

                    query.callback({
                        results: options
                    });
                };
            } else {
                if (!opts.query) {
                    throw new Error("You need to supply a query function!");
                }

                getOptions = function (callback) {
                    opts.query({
                        term: "",
                        callback: function (query) {
                            callback(query.results);
                        }
                    });
                };
            }

            getSelection = function (callback) {
                getOptions(function (options) {
                    var selection = [];
                    for (var i = 0; i < options.length; i++) {
                        var option = options[i];
                        if (isMultiple) {
                            if (controller.$viewValue && controller.$viewValue.indexOf(option.id) > -1) {
                                selection.push(option);
                            }
                        } else {
                            if (controller.$viewValue === option.id) {
                                callback(option);
                                return;
                            }
                        }
                    }
                    callback(selection);
                });
            };

            controller.$render = function () {
                getSelection(function (selection) {
                    if (isMultiple) {
                        element.select2('data', selection);
                    } else {
                        element.select2('val', selection.id);
                    }
                });
            };

            opts.initSelection = function (element, callback) {
                getSelection(callback);
            };

            $timeout(function () {
                element.select2(opts);
                element.on('change', function (e) {
                    scope.$apply(function () {
                        modelFn.assign(scope, e.val);
                    });
                });
                controller.$render();
            });
        }
    };
});
