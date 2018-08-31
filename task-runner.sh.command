#!/bin/bash
##############
# node-slate #
##############

# To make this file runnable:
#     $ chmod +x *.sh.command

banner="node-slate"
projectHome=$(cd $(dirname $0); pwd)
webPage=build/index.html

setupTools() {
   # Check for Node.js installation and download project dependencies
   cd $projectHome
   echo
   echo $banner
   echo $(echo $banner | sed -e "s/./=/g")
   pwd
   echo
   echo "Node.js:"
   which node || { echo "Need to install Node.js: https://nodejs.org"; exit; }
   node --version
   npm install
   npm update
   npm outdated
   echo
   }

runTasks() {
   cd $projectHome
   npm test
   npm run build
   echo
   }

openBrowser() {
   cd $projectHome
   echo "Open:"
   echo "$projectHome/$webPage"
   echo "(use Chrome or Firefox)"  #macOS Safari encounters: SecurityError (DOM Exception 18)
   echo
   sleep 2
   open $webPage
   }

setupTools
runTasks
openBrowser
