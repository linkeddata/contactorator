// Contacts app
//
// Using tabulator pane
//
// This is or was part of https://github.com/timbl/app-contact.js
//




document.addEventListener('DOMContentLoaded', function() {

    var utils = tabulator.panes.utils;
    
    
    var complainIfBad = function(ok, message) {
        if (!ok) {
            div.appendChild(tabulator.panes.utils.errorMessageBlock(dom, message, 'pink'));
        }
    };


    // Utility functions
    //          All these should be common and shipped elswehere
    //   @@ extract any pad-specific stuff


    ////////////////////////////////////// Getting logged in with a WebId
    
    var setUser = function(webid) {
        if (webid) {
            tabulator.preferences.set('me', webid);
            console.log("(SetUser: Logged in as "+ webid+")")
            me = kb.sym(webid);
            // @@ Here enable all kinds of stuff
        } else {
            tabulator.preferences.set('me', '');
            console.log("(SetUser: Logged out)")
            me = null;
        }
        if (webid && waitingForLogin) {
            waitingForLogin = false;
            showAppropriateDisplay();
        }
    }


    ////////// Who am I

    var whoAmI = function(doc) {
        var me_uri = tabulator.preferences.get('me');
        me = me_uri? kb.sym(me_uri) : null;
        tabulator.panes.utils.checkUser(doc, setUser);
            
        if (!tabulator.preferences.get('me')) {
            console.log("(You do not have your Web Id set. Sign in or sign up to make changes.)");

            if (tabulator.mode == 'webapp' && typeof document !== 'undefined' &&
                document.location &&  ('' + document.location).slice(0,16) === 'http://localhost') {
             
                me = kb.any(subject, tabulator.ns.dc('author')); // when testing on plane with no webid
                console.log("Assuming user is " + me)   
            }

        } else {
            me = kb.sym(tabulator.preferences.get('me'))
            // console.log("(Your webid is "+ tabulator.preferences.get('me')+")");
        };
    }




    ////////////////////////////////  Reproduction: spawn a new instance
    //
    // Viral growth path: user of app decides to make another instance
    //
    //

    var newInstanceButton = function(noun) {
        var button = div.appendChild(dom.createElement('button'));
        button.textContent = "Start another " + noun;
        button.addEventListener('click', function() {
            return showBootstrap(subject, spawnArea, noun)
        })
        return button;
    };


    // Option of either using the workspace system or just typing in a URI
    //
    var showBootstrap = function showBootstrap(thisInstance, container, noun) {
        var div = utils.clearElement(container);
        var na = div.appendChild(tabulator.panes.utils.newAppInstance(
            dom, "Start a new " + noun + " in a workspace", initializeNewInstanceInWorkspace));
        
        var hr = div.appendChild(dom.createElement('hr')); // @@
        
        var p = div.appendChild(dom.createElement('p'));
        p.textContent = "Where would you like to store the data for the " + noun + "?  " +
        "Give the URL of the directory where you would like the data stored.";
        var baseField = div.appendChild(dom.createElement('input'));
        baseField.setAttribute("type", "text");
        baseField.size = 80; // really a string
        baseField.label = "base URL";
        baseField.autocomplete = "on";

        div.appendChild(dom.createElement('br')); // @@
        
        var button = div.appendChild(dom.createElement('button'));
        button.textContent = "Start new " + noun + " at this URI";
        button.addEventListener('click', function(e){
            var newBase = baseField.value;
            if (newBase.slice(-1) !== '/') {
                newBase += '/';
            }
            initializeNewInstanceAtBase(thisInstance, newBase);
        });
    } 
          

    /////////  Create new document files for new instance of app

    var initializeNewInstanceInWorkspace = function(ws) {
        var newBase = kb.any(ws, ns.space('uriPrefix'));
        if (!newBase) {
            newBase = ws.uri.split('#')[0];
        } else {
	    newBase = newBase.value;
	}
        if (newBase.slice(-1) !== '/') {
            $rdf.log.error(appPathSegment + ": No / at end of uriPrefix " + newBase ); // @@ paramater?
            newBase = newBase + '/';
        }
        var now = new Date();
        newBase += appPathSegment + '/id'+ now.getTime() + '/'; // unique id 
        
        initializeNewInstanceAtBase(thisInstance, newBase);
    }
    
    
    ////////////////////////////////////////////////////////
    
    

    var initializeNewInstanceAtBase = function(thisInstance, newBase) {

        var here = $rdf.sym(thisInstance.uri.split('#')[0]);

        var sp = tabulator.ns.space;
        var kb = tabulator.kb;
        
        var htmlContents = "<!DOCTYPE html>\
<html>\
<head><meta charset='UTF-8'>\
<link type='text/css' rel='stylesheet' href='../Library/Mashup/tabbedtab.css' />\
<script type='text/javascript' src='../Library/Mashup/mashlib-alpha.js'></script>\
<script>\
document.addEventListener('DOMContentLoaded', function() {\
    var uri = window.location.href;\
    var data_uri = window.document.title = uri.slice(0, uri.lastIndexOf('/')+1) + 'book.ttl#this';\
    \
    var path = uri.indexOf('/', uri.indexOf('//') +2) + 1;\
    var origin = uri.slice(0, path);\
    var proxy_uri = 'https://databox.me/,proxy?uri={uri}' \
\
    $rdf.Fetcher.crossSiteProxyTemplate = proxy_uri;\
    \
    var subject = $rdf.sym(data_uri);\
    tabulator.outline.GotoSubject(subject, true, undefined, true, undefined);\
});\
</script>\
</head>\
<body>\
<div class='TabulatorOutline' id='DummyUUID'>\
    <table id='outline'></table>\
</div>\
</body>\
</html>"

        
        var bookContents = "@prefix vcard: <http://www.w3.org/2006/vcard/ns#>.\
@prefix ab: <http://www.w3.org/ns/pim/ab#>.\
@prefix dc: <http://purl.org/dc/elements/1.1/>.\
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\
\
<#this> a vcard:AddressBook;\
    dc:title 'New address Book';\
    vcard:nameEmailIndex <people.ttl>;\
    vcard:groupIndex <groups.ttl>. "

        var toBeWritten = [
            { uri:   'book.ttl', content: bookContents, contentType: 'text/html' },
            { uri:   'groups.ttl', content: '', contentType: 'text/turtle' },
            { uri:   'people.ttl', content: '', contentType: 'text/turtle'},
        ];

        var doNextTask = function() {
            var task = toBeWritten.shift();
            tabulator.panes.utils.webOperation('PUT', newBase + task.uri, {contentType: task.contentType}, function(uri, ok) {
                    if (ok) {
                        tabulator.panes.utils.setACLUserPublic(task.uri, me, [], function(){
                            if (ok) {
                                doNextTask()
                            } else {
                                complian("Error setting access permisssions for " + task.uri)
                            };
                        })
                    } else {
                        complain();
                    }
                }
            );
        }

        doNextTask();
        
    }; // initializeNewInstanceAtBase


    // Manage participation in this session @@ TBD
    //
    //  This is more general tham the pad.
    //
    var manageParticipation = function(subject) {
        if (!me) throw "Unknown user";
        var parps = kb.each(subject, ns.wf('participation')).filter(function(pn){
            kb.hold(pn, ns.dc('author'), me)});
        if (parps.length > 1) throw "Multiple participations";
        if (!parps.length) {
            participation = tabulator.panes.utils.newThing(appRootDoc);
        }
    
    }



    
    /////////////////////////

   
    var listenToIframe = function() {
        // Event listener for login (from child iframe)
        var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
        var eventListener = window[eventMethod];
        var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

        // Listen to message from child window
        eventListener(messageEvent,function(e) {
          if (e.data.slice(0,5) == 'User:') {
            // the URI of the user (currently either http* or dns:* values)
            var user = e.data.slice(5, e.data.length);
            if (user.slice(0, 4) == 'http') {
              // we have an HTTP URI (probably a WebID), do something with the user variable
              // i.e. app.login(user);
                setUser(user);
            }
          }
        },false);    
    }
    
    ///////////////////////////////////
    
    var showResults = function(exists) {
        console.log("showResults()");
        
        whoAmI(appRootDoc); // Set me  even if on a plane
        
        var title = kb.any(subject, ns.dc('title'))
        if (title) {
            window.document.title = title.value;
        }
        options.exists = exists;
        appEle = (tabulator.panes.utils.notepad(dom, appRootDoc, subject, me, options));
        naviMain.appendChild(appEle);
        
        var initiated = tabulator.sparql.setRefreshHandler(appRootDoc, appEle.reloadAndSync);
    };
    
    var showSignon = function showSignon() {
        var d = utils.clearElement(naviMain);
        // var d = div.appendChild(dom.createElement('div'));
        var origin =  window && window.location ? window.location.origin : '';
        d.innerHTML = '<p style="font-size: 120%; background-color: #ffe; padding: 2em; margin: 1em; border-radius: 1em;">'+
        'You need to be logged in.<br />To be able to use this app'+
            ' you need to log in with webid account at a storage provider.</p> '+
            '<iframe class="text-center" src="https://linkeddata.github.io/signup/?ref=' + origin + '" '+
            'style="margin-left: 1em; margin-right: 1em; width: 95%; height: 40em;" '+
            ' sandbox="allow-same-origin allow-scripts allow-forms" frameborder="0"></iframe>';
            listenToIframe();
            waitingForLogin = true; // hack
    };
    
   
 
    // Read or create empty data file
    
    var loadAppData = function () {
        var div = naviMain;
        fetcher.nowOrWhenFetched(appRootDoc.uri, undefined, function(ok, body, xhr){
            if (!ok) {   
                if (0 + xhr.status === 404) { ///  Check explictly for 404 error
                    console.log("Initializing app data file " + appRootDoc)
                    updater.put(appRootDoc, [], 'text/turtle', function(uri2, ok, message, xhr) {
                        if (ok) {
                            kb.fetcher.saveRequestMetadata(xhr, kb, appRootDoc.uri);
                            kb.fetcher.saveResponseMetadata(xhr, kb); // Drives the isEditable question
                            utils.clearElement(naviMain);
                            showResults(false);
                        } else {
                            complainIfBad(ok, "FAILED to create app data file at: "+ appRootDoc.uri +' : ' + message);
                            console.log("FAILED to craete app data file at: "+ appRootDoc.uri +' : ' + message);
                        };
                    });
                } else { // Other error, not 404 -- do not try to overwite the file
                    complainIfBad(ok, "FAILED to read app data file: " + body);
                }
            } else { // Happy read
                utils.clearElement(naviMain);
                if (kb.holds(subject.doc(), ns.rdf('type'), ns.wf('DummyResource'))) {
                    showBootstrap(subject, naviMain, appInstanceNoun);
                } else {
                    showResults(true);
                    naviMiddle3.appendChild(newInstanceButton("pad"));
                }
            }
        });
    };
        
    ////////////////////////////////////////////// Body of App (on loaded lstner)



    var appPathSegment = 'contactorator.timbl.com';
    var appInstanceNoun = 'address book';
        
    var kb = tabulator.kb;
    var fetcher = tabulator.sf;
    var ns = tabulator.ns;
    var dom = document;
    var me;
    var updater = new $rdf.sparqlUpdate(kb);
    var waitingForLogin = false;

    var uri = window.location.href;
    var base = uri.slice(0, uri.lastIndexOf('/')+1);
    var subject_uri = base  + 'book.ttl#this';
    
    var subject = kb.sym(subject_uri);
    var thisInstance = subject;
         
    var appRootDoc = $rdf.sym(base + 'book.ttl');
    var appEle;
    
    var div = document.getElementById('appTarget');


    
    //  Build the DOM for creating a new instance
    
    var structure = div.appendChild(dom.createElement('table')); // @@ make responsive style
    structure.setAttribute('style', 'background-color: white; min-width: 94%; margin-right:3% margin-left: 3%; min-height: 13em;');
    

    var naviTop = structure.appendChild(dom.createElement('tr')); // stuff
    var naviMain = naviTop.appendChild(dom.createElement('td'));
    naviMain.setAttribute('colspan', '3');

    var naviMiddle = structure.appendChild(dom.createElement('tr')); // controls
    var naviMiddle1 = naviMiddle.appendChild(dom.createElement('td'));
    var naviMiddle2 = naviMiddle.appendChild(dom.createElement('td'));
    var naviMiddle3 = naviMiddle.appendChild(dom.createElement('td'));
    
    var naviStatus = structure.appendChild(dom.createElement('tr')); // status etc
    var statusArea = naviStatus.appendChild(dom.createElement('div')); 
    
    var naviSpawn = structure.appendChild(dom.createElement('tr')); // create new
    var spawnArea = naviSpawn.appendChild(dom.createElement('div'));
    
    
    var naviMenu = structure.appendChild(dom.createElement('tr'));
    naviMenu.setAttribute('class', 'naviMenu');
    naviMenu.setAttribute('style', 'background-color: white;');
//     'margin-top: 3em;');
    var naviTDstyle = ' text-align: middle; vertical-align: middle; padding-top: 4em; ';
    var naviLeft = naviMenu.appendChild(dom.createElement('td'));
        naviLeft.setAttribute('style', naviTDstyle);
    var naviCenter = naviMenu.appendChild(dom.createElement('td'));
        naviCenter.setAttribute('style', naviTDstyle);
    var naviRight = naviMenu.appendChild(dom.createElement('td'));
        naviRight.setAttribute('style', naviTDstyle);
    
    var options = { statusArea: statusArea, timingArea: naviMiddle1 }
    
    if (base.indexOf('github.io') >= 0 ) {// @@ More generically looking for read-only
        showBootstrap(subject, spawnArea, appInstanceNoun);
    } else {
	loadAppData();
    }

});


