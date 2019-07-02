'use strict';
(function() {

const appModule = angular.module('pozBlog', ['ui.bootstrap', 'ngRoute']);

appModule.controller('AppController', ['$rootScope', '$location', '$anchorScroll', '$http',
	function($rootScope, $location, $anchorScroll, $http) {

	$rootScope.posts = [];

	const ctrl = this;
	ctrl.isSidebarMinimized = false;

	ctrl.isActiveView = function (viewLocation) {
		return $location.path().startsWith(viewLocation);
	};

	ctrl.scrollToTop = function () {
		$anchorScroll('top');
	};

	ctrl.toggleSidebar = function() {
		ctrl.isSidebarMinimized = !ctrl.isSidebarMinimized;
	};

	// Load posts index
	$http.get('posts.json').then(function(response) {
		$rootScope.posts = response.data.posts;
	});
}]);


appModule.controller('PostController', ['$rootScope', '$routeParams', '$http', '$filter', '$sce',
	function($rootScope, $routeParams, $http, $filter, $sce) {
		
	const ctrl = this;
	ctrl.post = null;
	ctrl.postIndex = null;
	
	ctrl.getAsHtml = function(content) {
		return $sce.trustAsHtml(content);
	};

	function loadPost(postId) {
		// Get post header
		ctrl.post = $filter('filter')($rootScope.posts, postId, true)[0];
		// Get post content
		let postPath = ctrl.post.date.replace(/-/g, '/');
		postPath = 'posts/'+ postPath +'/';
		$http.get(postPath +'index.html').then(function(response) {
			const content = response.data;
			ctrl.post.content = content.replace(/{{POST_PATH}}/g, postPath);
		});
		// Get post index
		ctrl.postIndex = getPostIndex();
	}
	
	function getPostIndex() {
		let postIndex = null;
		for (let i=0; postIndex == null && i<$rootScope.posts.length; i++) {
			if ($rootScope.posts[i].date === ctrl.post.date)
				postIndex = i;
		}
		return postIndex;
	}
	
	ctrl.getPreviousPostUrl = function() {
		if (ctrl.hasPreviousPost()) {
			const previousPost = $rootScope.posts[ctrl.postIndex -1];
			return '#/post/'+ previousPost.date;	
		}
		return '';		
	};
	
	ctrl.getNextPostUrl = function() {
		if (ctrl.hasNextPost()) {
			const nextPost = $rootScope.posts[ctrl.postIndex +1];
			return '#/post/'+ nextPost.date;
		}
		return '';
	};
	
	ctrl.hasNextPost = function() {
		return (ctrl.postIndex !== $rootScope.posts.length -1);
	};
	
	ctrl.hasPreviousPost = function() {
		return (ctrl.postIndex !== 0);
	};
	
	loadPost($routeParams.postId);
}]);


appModule.controller('PostsController', ['$rootScope', '$routeParams', '$http', '$sce', '$anchorScroll',
	function($rootScope, $routeParams, $http, $sce, $anchorScroll) {
		
	const ctrl = this;
	ctrl.posts = [];
	ctrl.pageIndex = angular.isDefined($routeParams.pageIndex) ? $routeParams.pageIndex : 1;
	ctrl.totalCount = $rootScope.posts.length;
	
	ctrl.getAsHtml = function(content) {
		return $sce.trustAsHtml(content);
	};

	ctrl.pageChanged = function() {
		ctrl.posts = [];
		$anchorScroll('top');
		const startIndex = (ctrl.pageIndex-1) * 3;
		const stopIndex = startIndex +3;
		for (let postIndex = startIndex; postIndex < ctrl.totalCount && postIndex < stopIndex; postIndex++) {
			ctrl.posts.push(angular.copy($rootScope.posts[postIndex]));
		}
		angular.forEach(ctrl.posts, function(post) {
			loadPostContent(post)
		});
	};
	
	function loadPostContent(post) {
		let postPath = post.date.replace(/-/g, '/');
		postPath = 'posts/'+ postPath +'/';
		$http.get(postPath +'index.html').then(function(response) {
			const content = response.data;
			post.content = content.replace(/{{POST_PATH}}/g, postPath);
		});
	}
	
	// Trigger initial display once posts are loaded
	$rootScope.$watch('posts', function () {
		ctrl.pageChanged();
	});
}]);


appModule.controller('ArchiveController', ['$rootScope', '$filter', function($rootScope, $filter) {
	this.uniqueYears = [];
	
	function getUniqueYears() {
		const uniqueYears = [];
		const filter = $filter('filter');
		angular.forEach($rootScope.posts, function(post) {
			const postYear = post.date.substring(0,4);
			if (filter(uniqueYears, postYear, true).length === 0)
				uniqueYears.push(postYear);
		});
		return uniqueYears;
	}
	
	this.uniqueYears = getUniqueYears();
}]);


appModule.directive('toggleableLink', function() {
	return {
		restrict: 'A',
		scope: {
			enabled: '=toggleableLink'
		},
		link: function(scope, element, attrs) {
			element.bind('click', function(event) {
				if(!scope.enabled)
					event.preventDefault();
			});
		}
	};
});


appModule.config(function($routeProvider, $locationProvider) {
	$locationProvider.hashPrefix('');
	$routeProvider
	.when('/posts/:pageIndex?', {
		templateUrl: 'views/posts.html'
	})
	.when('/post/:postId', {
		templateUrl: 'views/post.html'
	})
	.when('/archives', {
		templateUrl: 'views/archives.html'
	})
	.otherwise({
		redirectTo: '/posts'
	});
});

appModule.run(['$rootScope', '$location', '$window', function($rootScope, $location, $window){
	$rootScope.$on('$routeChangeStart', function (event) {
		if (!$window.ga)
			return;
		$window.ga('send', 'pageview', $location.path());
	});
}]);

})();
