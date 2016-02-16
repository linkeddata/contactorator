// Contacts app
//
// Using tabulator pane
//
// This is or was part of https://github.com/timbl/app-contact.js
//




document.addEventListener('DOMContentLoaded', function() {

    var utils = tabulator.panes.utils;

    var complain = function(message) {
        div.appendChild(tabulator.panes.utils.errorMessageBlock(dom, message, 'pink'));
    };


    // Option of either using the workspace system or just typing in a URI
    //
    var showBootstrap = function showBootstrap(thisInstance, container, noun) {
        var div = utils.clearElement(container);
        var appDetails = { noun: noun, appPathSegment: 'contactorator.timbl.com'}
        var na = div.appendChild(tabulator.panes.utils.newAppInstance(
            dom, appDetails , initializeNewInstanceInWorkspace));

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

    var findRegisteredInstances = function(me, theClass){

    }

    /////////  Create new document files for new instance of app

    var initializeNewInstanceInWorkspace = function(ws, wsBase) {
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

        tabulator.panes.byName('contact').clone(thisInstance, newBase, {me: me, div: div, dom: dom})
        return;

    }; // initializeNewInstanceAtBase



    var showResults = function(context) {
        console.log("showResults()");

        var proxy_uri = 'https://databox.me/,proxy?uri={uri}' // Temp hack @@
        $rdf.Fetcher.crossSiteProxyTemplate = proxy_uri;

        tabulator.outline.GotoSubject(subject, true, undefined, true, undefined);

    };


    ////////////////////////////////////////////// Body of App (on loaded listner)



    var appPathSegment = 'contactorator.timbl.com';
    var appInstanceNoun = 'address book';

    var kb = tabulator.kb;
    // var fetcher = tabulator.sf;
    var ns = tabulator.ns;
    var utils = tabulator.panes.utils
    var dom = document;
    var me;
    // var updater = new $rdf.sparqlUpdate(kb);
    // var waitingForLogin = false;

    var uri = window.location.href;
    var base = uri.slice(0, uri.lastIndexOf('/')+1);

    var subject = kb.sym(base  + 'book.ttl#this');
    var thisInstance = subject;

    var appEle;

    var div = document.getElementById('appTarget');
    var addressBooks, loggedIn = false;

    var RunApp = function(context) {
        utils.findAppInstances(context, ns.vcard('AddressBook'))
        .then(function(context){
            addressBooks = context.instances;
            kb.fetcher.load(subject.doc()).then(function(xhr){
                utils.clearElement(div);
                if (kb.holds(subject.doc(), ns.rdf('type'), ns.wf('DummyResource'))) {
                    console.log("Dummy resource, not local. Address books: "+ addressBooks);
                    if (addressBooks.length === 0) {
                        showBootstrap(subject, div, appInstanceNoun);
                    } else {
                        subject = addressBooks[0]; // @@ later ask choice.   Switch
                        thisInstance = subject;
                        var base = subject.uri.slice(0, subject.uri.lastIndexOf('/')+1);
                        showResults(context);
                    }
                } else {
                    console.log("Real web app.  Address books: "+ addressBooks);
                    showResults(context);
                    // naviMiddle3.appendChild(newInstanceButton(appInstanceNoun));
                }
            })
        });
    }

    var context = { div: div, statusArea: div, dom: dom  };
    tabulator.panes.utils.logInLoadProfile(context)
    .then(tabulator.panes.utils.loadPreferences)
    .then(RunApp);
//    .then(function(resolve, reject){console.log("MADE IT");  resolve(context)})

//    var lsb = tabulator.panes.utils.loginStatusBox(dom, gotIDChange);
//    div.appendChild(lsb); // remove later

});
