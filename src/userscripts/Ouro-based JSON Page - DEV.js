// ==UserScript==
// @name         Ouro-based JSON Page - DEV
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Use the Ouro framework to manipulate JSON files
// @author       You
// @require      file:///Users/christophe/bin/ouro/src/ouro.js
// @require      file:///Users/christophe/bin/ouro/src/scraper.js
// @grant        unsafeWindow

// @match        *://*/*.json*
// @match        file:///Users/christophe/*.json
// ==/UserScript==

//                                   .:-----.
//                            :#@@@@%###++++*##%@@@@@*:.
//                        .@@@%:                      +%@@.
//                     .@@@:.        :*##:     =         .@%
//                   =@@:        .-###%@@@@@@@@=      .@@. .%%.
//                 -@#    *%@@@@@@%-.        -@%             .#@.
//                %@: +@@@+--%@=              .%@-  #@@@@%++ =%+
//              :@#:@@%-  =@*.                  .#@= -@%    %*
//             :@@@@=   .@%.                       =@# #%   -
//             @@@=   .@@#                           .%%:%@. :%@=
//            #@%    %@@#                OURO                  *@@+
//           -@*   -@@@%                                        +@+@:
//           #@   +@#-@.    Object Unified Reflective Ontology   ##-@=
//           %+  +@* *%    a JavaScript AOP Metaobject Protocol  =@.=@
//           %- =@*  @%                                          :@: @#
//           %- @@.  #%       The Forging of the Ouroboros       +@  @%
//           ##=@+   -@.    Out of the void, the forge is lit.   @+ -@%
//           #@*@=   -@%     The serpent bites its own tail,    #% .@@#
//            @@@=   =@@-        and from the circle,          %% .@@@+
//            *@@=   -@@@.        true creation begins.      =@= +@%%%
//             %@%   :@%-@*                                 @@.=@@-=@:
//              %@=   @@..@@.      Userscript loader      %@:+@@= -@=
//               #@.  :@%  -%@:                        =@@*@@#.  +@-
//                =@-  *@+   .%@@=                  =@@@@@+.    %%.
//                  #@: %@=     *@@@@@%--------=@@@@%*-      .#@=
//                    %@-#@%       #@@@*:.....            :@@@=
//                      =@@@@-         #@@@@@@@#=-=#@@@@@@@@:
//                         -@@@%             ...--:..*@@@.
//                             :#@@@%#*-    :+##%@@@=:
//                                    .::---:.
//

/* global Ouro Page */
Ouro.boros;
Ouro.exportTo(unsafeWindow);

Page.start();
