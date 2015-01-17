function parseURL(url) {
    var parser = document.createElement('a'),
        searchObject = {},
        queries, split, i;
    // Let the browser do the work
    parser.href = url;
    // Convert query string to object
    queries = parser.search.replace(/^\?/, '').split('&');
    for( i = 0; i < queries.length; i++ ) {
        split = queries[i].split('=');
        searchObject[split[0]] = split[1];
    }
    return {
        protocol: parser.protocol,
        host: parser.host,
        hostname: parser.hostname,
        port: parser.port,
        pathname: parser.pathname,
        search: parser.search,
        searchObject: searchObject,
        hash: parser.hash
    };
}

(function() {
  var app = angular.module('goquadro', ['ui.router', 'ngAnimate', 'ngMaterial']);
  var apiEndpoint = 'https://api.goquadro.com/v1'
  var jwtName = "gqtoken"

  app.controller('UserCtrl', function ($scope, $http, $state, $window) {

    $scope.actions = {};

    $scope.actions.login = function ($state) {
      $http
        .post(apiEndpoint+'/login', $scope.user)
        .success(function (data, status, headers, config) {
          $window.localStorage[jwtName] = data.gqtoken;
          $scope.addAlert({type: 'success', msg: "You've just logged in."});
        })
        .error(function (data, status, headers, config) {
          $window.localStorage.removeItem(jwtName);
          $scope.clearuserform();
          $scope.addAlert({type: "danger", msg: 'Check your internet connection.'});
        });
    };

    $scope.actions.signup = function(){
      $http.post(apiEndpoint+'/signup', $scope.user)
        .success(function(){
          $scope.addAlert({type: "success", msg: 'You have correctly registered to GoQuadro! Please check your e-mail.'});
        })
        .error(function(data){
          $scope.clearuserform();
          $scope.addAlert({type: "danger", msg: JSON.parse(data)});
        });
    };

    $scope.actions.logout = function($window){
      console.log("Triggered logout function.");
      $window.localStorage.removeItem(jwtName);
      $scope.addAlert({type: "success", msg: 'You have been logged out of GoQuadro.'});
    };
  });

  app.factory('authInterceptor', function ($rootScope, $q, $window) {
    return {
      request: function (config) {
        config.headers = config.headers || {};
        // If there is a token stored locally, and if the request is directed to the api endpoint,
        // then add the auth token to the request headers.
        if ($window.localStorage[jwtName] && config.url.substring(0, 27) === apiEndpoint) {
          config.headers.gqtoken = $window.localStorage[jwtName];
        }
        return config;
      },
      response: function (response) {
        if (response.status === 401) {
          // handle the case where the user is not authenticated
          console.log("GOT A 401")
        }
        return response || $q.when(response);
      }
    };
  });

  app.config(function ($httpProvider) {
    $httpProvider.interceptors.push('authInterceptor');
  });

  app.config(function ( $stateProvider, $urlRouterProvider, $locationProvider) {
      // For any unmatched url
      $urlRouterProvider.otherwise('/');
  
      $stateProvider
        .state('home', {
          url: "/",
          templateUrl: "html/documents.html",
          controller: function($scope) {
            // Refresh user data?
          }
        })
        .state('settings', {
          url: "/settings",
          templateUrl: "html/settings.html",
          controller: function($scope) {
            if ($scope.me.authenticated){
              var totaltopics = 0;
              var totaldocs = 0;
              for (var key in $scope.topics) {
                totaltopics += 1;
                totaldocs += $scope.topics[key].length;
              };
              $scope.me.totaldocs = totaldocs;
              $scope.me.totaltopics = totaltopics;
            };
          }
        })
        .state('login', {
          url: "/login",
          templateUrl: "html/login.html",
          controller: function($scope, $state) {
            if ($scope.me.authenticated){
              $state.go("home");
            }
          }
        })
        .state('signup', {
          url: "/signup",
          templateUrl: "html/signup.html",
          controller: function($scope, $state) {
            if ($scope.me.authenticated){
              $state.go("home");
            }
          }
        })
        .state('logout', {
          url: "/logout",
          controller: function($scope) {
            $scope.actions.logout();
          }
        });
      $locationProvider.html5Mode(true);
    });


  app.controller('GqDataCtrl', ['$scope', '$http', '$state', '$timeout', '$mdSidenav', function ($scope, $http, $state, $timeout, $mdSidenav) {

    $scope.toggleRight = function(doc) {
      if ($scope.selected == doc) {
        $scope.selected = null;
      } else {
        $scope.selected = doc;
        $mdSidenav('right').toggle();
      };
    };

    $scope.getDocs = function() {
      $http.get(apiEndpoint+'/me/documents')
        .success(function(data){
          $scope.me.documents = data;
        })
        .error(function (data){
          console.log("http request failed.");
        });
    };

    $scope.rmDoc = function(doc) {
      $http.delete(apiEndpoint+'/me/documents/'+doc.docID)
        .success(function(){
          $scope.me.documents.splice($scope.me.documents.indexOf(doc),1);
          $scope.addAlert({type: "success", msg: 'Document has been deleted.'});
          $scope.selected = null;
        })
        .error(function(data){
          console.log("http request failed.");
          $scope.clearuserform();
          $scope.addAlert({type: "danger", msg: JSON.parse(data)});
        });
    };

    $scope.addAlert = function(msgObj) {
      $scope.alerts = [];
      $scope.alerts.push(msgObj);
    };

    $scope.closeAlert = function(index) {
      $scope.alerts.splice(index, 1);
    };

    $scope.clearuserform = function(){
      $scope.user = {};
    };

    $scope.refresh = function(){
      $scope.clearuserform();
      $scope.me = {}
      $scope.topics = {}
      $http.get(apiEndpoint+'/me').success(function(data){
        if (data.username) {
          data.authenticated = true;
        }
        $scope.me = data;
        if ($scope.me.authenticated){
          $scope.getDocs();
        }
      })
      .error(function(){
        console.log("http request failed.");
      });
    };
    $scope.refresh();
  }]);

  app.controller('RightCtrl', function($scope, $timeout, $mdSidenav) {
    $scope.close = function() {
      $mdSidenav('right').close();
    };
  });

  app.directive('gqDocForm', function(){
    return {
      restrict: 'A',
      templateUrl: 'html/docform.html'
    };
  });

})();