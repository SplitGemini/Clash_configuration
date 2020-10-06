genpac --config-from="genpac.ini"
copy /y pac.txt .\Clash_configuration
cd Clash_configuration
git add .
git commit -m "update pac"
git push
pause