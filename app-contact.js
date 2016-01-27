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

    var complain = function(message) {
        div.appendChild(tabulator.panes.utils.errorMessageBlock(dom, message, 'pink'));
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
            dom, "Start a new " + noun , initializeNewInstanceInWorkspace));
        
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
            var sisu = tabulator.panes.utils.signInOrSignUpBox(dom, function(id) {
                me = $rdf.sym(id);
                initializeNewInstanceAtBase(thisInstance, newBase);
            });
            div.appendChild(sisu);
        });
        
    } 
          

    /////////  Create new document files for new instance of app

    var initializeNewInstanceInWorkspace = function(ws, wsBase) {
        //
        /*
        var newBase = kb.any(ws, ns.space('uriPrefix'));
        if (!newBase) {
            newBase = ws.uri.split('#')[0];
        } else {
	    newBase = newBase.value;
	}
        */
        if (newBase.slice(-1) !== '/') {
            $rdf.log.error(appPathSegment + ": No / at end of uriPrefix " + newBase ); // @@ paramater?
            wsBase = wsBase + '/';
        }

        var now = new Date();
        newBase =  wsBase + appPathSegment + '/id'+ now.getTime() + '/'; // unique id
        initializeNewInstanceAtBase(thisInstance, newBase);
    }
    
    
    ////////////////////////////////////////////////////////
    
    

    var initializeNewInstanceAtBase = function(thisInstance, newBase) {

        var here = $rdf.sym(thisInstance.uri.split('#')[0]);

        var bookContents = '@prefix vcard: <http://www.w3.org/2006/vcard/ns#>.\n\
@prefix ab: <http://www.w3.org/ns/pim/ab#>.\n\
@prefix dc: <http://purl.org/dc/elements/1.1/>.\n\
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.\n\
\n\
<#this> a vcard:AddressBook;\n\
    dc:title "New address Book";\n\
    vcard:nameEmailIndex <people.ttl>;\n\
    vcard:groupIndex <groups.ttl>. \n\n'
    
        bookContents += '<#this> <http://www.w3.org/ns/auth/acl#owner> <' + me.uri + '>.\n\n';

        var toBeWritten = [
            { to:   'index.html', contentType: 'text/html' },
            { to:   'book.ttl', content: bookContents, contentType: 'text/turtle' },
            { to:   'groups.ttl', content: '', contentType: 'text/turtle' },
            { to:   'people.ttl', content: '', contentType: 'text/turtle'},
            { to:   '', existing: true, aclOptions: { defaultForNew: true}},
        ];

        var newAppPointer = newBase + 'index.html'; // @@ assuming we can't trust server with bare dir

        var offline = tabulator.panes.utils.offlineTestID();
        if (offline) {
            toBeWritten.push( {to: 'local.html', from: 'local.html', contentType: 'text/html' });
            newAppPointer = newBase + 'local.html'; // kludge for testing
        }

        // Ask user abut ACLs?
        //
        //   Add header to PUT     If-None-Match: *       to prevent overwrite
        //
        var doNextTask = function() {
            if (toBeWritten.length === 0) {
                claimSuccess(newAppPointer, appInstanceNoun);
            } else {
                var task = toBeWritten.shift();
                console.log("Creating new file "+ task.to + " in new instance ")
                var dest = $rdf.uri.join(task.to, newBase); //
                var aclOptions = task.aclOptions || {};
                var checkOKSetACL = function(uri, ok) {
                    if (ok) {
                        tabulator.panes.utils.setACLUserPublic(dest, me, aclOptions, function(){
                            if (ok) {
                                doNextTask()
                            } else {
                                complain("Error setting access permisssions for " + task.to)
                            };
                        })
                    } else {
                        complain("Error writing new file " + task.to);
                    }
                };

                if ('content' in task) {
                    tabulator.panes.utils.webOperation('PUT', dest,
                        { data: task.content, saveMetadata: true, contentType: task.contentType},
                    checkOKSetACL);
                } else if ('existing' in task) {
                    checkOKSetACL(true, dest);
                } else {
                    var from = task.from || task.to; // default source to be same as dest
                    tabulator.panes.utils.webCopy(base + from, dest, task.contentType, checkOKSetACL);
                }
            }
        }

        doNextTask();
        
    }; // initializeNewInstanceAtBase

    var claimSuccess = function(uri, appInstanceNoun) { // @@ delete or grey other stuff
        console.log("Files created. App ready at " + uri)
        var p = div.appendChild(dom.createElement('p'));
        p.setAttribute('style', 'font-size: 140%;') 
        p.innerHTML = 
            "Your <a href='" + uri + "'><b>new " + appInstanceNoun + "</b></a> is ready. "+
            "<br/><br/><a href='" + uri + "'>Go to new " + appInstanceNoun + "</a>";

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
        
        var proxy_uri = 'https://databox.me/,proxy?uri={uri}' // Temp hack @@
        $rdf.Fetcher.crossSiteProxyTemplate = proxy_uri;
        
        tabulator.outline.GotoSubject(subject, true, undefined, true, undefined);

        /*
        
        whoAmI(appRootDoc); // Set me  even if on a plane
        
        var title = kb.any(subject, ns.dc('title'))
        if (title) {
            window.document.title = title.value;
        }
        options.exists = exists;
        appEle = (tabulator.panes.utils.notepad(dom, appRootDoc, subject, me, options)); // @@@@@@@@
        naviMain.appendChild(appEle);
        
        var initiated = tabulator.sparql.setRefreshHandler(appRootDoc, appEle.reloadAndSync);
        */
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
                complain("FAILED to read app data file: " + body);
            } else { // Happy read
                utils.clearElement(naviMain);
                if (kb.holds(subject.doc(), ns.rdf('type'), ns.wf('DummyResource'))) {
                    showBootstrap(subject, naviMain, appInstanceNoun);
                } else {
                    showResults(true);
                    // naviMiddle3.appendChild(newInstanceButton(appInstanceNoun));
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


