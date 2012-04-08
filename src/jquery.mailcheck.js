/*
 * Mailcheck https://github.com/Kicksend/mailcheck
 * Author
 * Derrick Ko (@derrickko)
 *
 * License
 * Copyright (c) 2012 Receivd, Inc.
 *
 * Licensed under the MIT License.
 *
 * v 1.1.1
 */
 
(function($){
  $.fn.mailcheck = function(opts, optsAlt) {
    var defaultDomains = ["yahoo.com", "google.com", "hotmail.com", "gmail.com", "me.com", "aol.com", "mac.com",
                          "live.com", "comcast.net", "googlemail.com", "msn.com", "hotmail.co.uk", "yahoo.co.uk",
                          "facebook.com", "verizon.net", "sbcglobal.net", "att.net", "gmx.com", "mail.com"];
    var defaultTopLevelDomains = ["co.uk", "com", "net", "org", "info", "edu", "gov", "mil"];
                          

    if (typeof opts === 'object' && optsAlt === undefined) {
      // only opts is passed in
      opts.domains = opts.domains || defaultDomains;
    } else {
      // domains are passed in as opts
      var domains = opts;
      opts = optsAlt;
      opts.domains = domains || defaultDomains;
    }
    opts.topLevelDomains = opts.topLevelDomains || defaultTopLevelDomains;
    opts.distanceFunction = Kicksend.sift3Distance;

    var result = Kicksend.mailcheck.suggest(encodeURI(this.val()), opts.domains, opts.topLevelDomains, opts.distanceFunction);
    if (result) {
      if (opts.suggested) {
        opts.suggested(this, result);
      }
    } else {
      if (opts.empty) {
        opts.empty(this);
      }
    }
  };
})(jQuery);

var Kicksend = {
  mailcheck : {
    threshold: 3,

    suggest: function(email, domains, topLevelDomains, distanceFunction) {
      email = email.toLowerCase();

      var emailParts = this.splitEmail(email);

      var closestDomain = this.findClosestDomain(emailParts.domain, domains, distanceFunction);
      
      if (closestDomain) {
        if (closestDomain != emailParts.domain) {
          // The email address closely matches one of the supplied domains; return a suggestion
          return { address: emailParts.address, domain: closestDomain, full: emailParts.address + "@" + closestDomain };  
        }
      } else {
        // The email address does not closely match one of the supplied domains
        var closestTopLevelDomain = this.findClosestDomain(emailParts.topLevelDomain, topLevelDomains);
        if (emailParts.domain && closestTopLevelDomain && closestTopLevelDomain != emailParts.topLevelDomain) {
          // The email address may have a mispelled top-level domain; return a suggestion
          var domain = emailParts.domain;
          closestDomain = domain.substring(0, domain.lastIndexOf(emailParts.topLevelDomain)) + closestTopLevelDomain;
          return { address: emailParts.address, domain: closestDomain, full: emailParts.address + "@" + closestDomain };
        }
      }
      /* The email address exactly matches one of the supplied domains, does not closely
       * match any domain and does not appear to simply have a mispelled top-level domain,
       * or is an invalid email address; do not return a suggestion.
       */
      return false;
    },

    findClosestDomain: function(domain, domains, distanceFunction) {
      var dist;
      var minDist = 99;
      var closestDomain = null;

      if (!domain || !domains) {
        return false;
      }
      if(!distanceFunction) {
        distanceFunction = this.sift3Distance;
      }
      
      for (var i = 0; i < domains.length; i++) {
        if (domain === domains[i]) {
          return domain;
        }
        dist = distanceFunction(domain, domains[i]);
        if (dist < minDist) {
          minDist = dist;
          closestDomain = domains[i];
        }
      }
      
      if (minDist <= this.threshold && closestDomain !== null) {
        return closestDomain;
      } else {
        return false;
      }
    },

    sift3Distance: function(s1, s2) {
      // sift3: http://siderite.blogspot.com/2007/04/super-fast-and-accurate-string-distance.html
      if (s1 == null || s1.length === 0) {
        if (s2 == null || s2.length === 0) {
          return 0;
        } else {
          return s2.length;
        }
      }

      if (s2 == null || s2.length === 0) {
        return s1.length;
      }

      var c = 0;
      var offset1 = 0;
      var offset2 = 0;
      var lcs = 0;
      var maxOffset = 5;

      while ((c + offset1 < s1.length) && (c + offset2 < s2.length)) {
        if (s1[c + offset1] == s2[c + offset2]) {
          lcs++;
        } else {
          offset1 = 0;
          offset2 = 0;
          for (var i = 0; i < maxOffset; i++) {
            if ((c + i < s1.length) && (s1[c + i] == s2[c])) {
              offset1 = i;
              break;
            }
            if ((c + i < s2.length) && (s1[c] == s2[c + i])) {
              offset2 = i;
              break;
            }
          }
        }
        c++;
      }
      return (s1.length + s2.length) /2 - lcs;
    },
    
    levenshteinDistance: function(s, t) {
      // Determine the Levenshtein distance between s and t
      if (!s || !t) {
        return 99;
      }     
      
      var m = s.length;
      var n = t.length;
      
      /* For all i and j, d[i][j] holds the Levenshtein distance between
       * the first i characters of s and the first j characters of t.
       * Note that the array has (m+1)x(n+1) values.
       */
      var d = new Array();
      for (var i = 0; i <= m; i++) {
        d[i] = new Array();
        d[i][0] = i;
      }
      for (var j = 0; j <= n; j++) {
        d[0][j] = j
      }
            
      // Determine substring distances
      for (var j = 1; j <= n; j++) {
        for (var i = 1; i <= m; i++) {
          if (s[i-1] == t[j-1]) { // Subtract one to start at strings' index zero instead of index one
            d[i][j] = d[i-1][j-1];
          } else {
            d[i][j] = Math.min(d[i-1][j] + 1,            // deletion
                               Math.min(d[i][j-1] + 1,   // insertion
                                        d[i-1][j-1] + 1) // substitution
                              );
          }
        }
      }
      // Return the strings' distance
      return d[m][n];
    },
    
    splitEmail: function(email) {
      var parts = email.split('@');

      if (parts.length < 2) {
        return false;
      }

      for (var i = 0; i < parts.length; i++) {
        if (parts[i] === '') {
          return false;
        }
      }
      
      var domain = parts.pop();
      var domainParts = domain.split('.');
      var tld = '';
      
      if (domainParts.length == 0) {
        // The address does not have a top-level domain
        return false;
      } else if (domainParts.length == 1) {
        // The address has only a top-level domain (valid under RFC)
        tld = domainParts[0];
      } else {
        // The address has a domain and a top-level domain
        for (var i = 1; i < domainParts.length; i++) {
          tld += domainParts[i] + '.';
        }
        if (domainParts.length >= 2) {
          tld = tld.substring(0, tld.length - 1);
        }
      }
      
      return {
        topLevelDomain: tld,
        domain: domain,
        address: parts.join('@')
      }
    }
  }
};
