@echo off
cd /d "%~dp0"
echo ============================================
echo  Iniciando o servidor do sistema do TCC...
echo ============================================
echo.
echo NAO FECHE esta janela enquanto estiver usando o site.
echo Quando aparecer "Servidor rodando em http://localhost:3000",
echo abra essa pagina no navegador (nao abra o arquivo index.html direto).
echo.
npm start
echo.
echo O servidor parou. Pressione qualquer tecla para fechar.
pause > nul
