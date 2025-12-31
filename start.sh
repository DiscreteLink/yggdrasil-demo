#!/bin/bash

# Yggdrasil Demo 快速启动脚本

echo "🌳 Yggdrasil Demo 启动中..."
echo ""
echo "📍 当前目录: $(pwd)"
echo ""

# 检测操作系统
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    CYGWIN*)    MACHINE=Cygwin;;
    MINGW*)     MACHINE=MinGw;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

echo "💻 检测到系统: ${MACHINE}"
echo ""

# 检查 Python 版本
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    PYTHON_VERSION=$(python3 --version)
    echo "✅ 找到 Python: ${PYTHON_VERSION}"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
    PYTHON_VERSION=$(python --version)
    echo "✅ 找到 Python: ${PYTHON_VERSION}"
else
    echo "❌ 未找到 Python，请先安装 Python"
    exit 1
fi

echo ""
echo "🚀 启动选项："
echo "   1. 主页面 (index.html)"
echo "   2. 宣传图生成器 (promo_generator.html)"
echo "   3. 同时打开两个页面"
echo ""
read -p "请选择 (1/2/3): " choice

PORT=8000

echo ""
echo "🌐 启动 HTTP 服务器 (端口: ${PORT})..."
echo ""

# 启动服务器
${PYTHON_CMD} -m http.server ${PORT} &
SERVER_PID=$!

# 等待服务器启动
sleep 2

# 根据选择打开浏览器
case $choice in
    1)
        URL="http://localhost:${PORT}/index.html"
        echo "📖 打开主页面: ${URL}"
        ;;
    2)
        URL="http://localhost:${PORT}/promo_generator.html"
        echo "🎨 打开宣传图生成器: ${URL}"
        ;;
    3)
        URL1="http://localhost:${PORT}/index.html"
        URL2="http://localhost:${PORT}/promo_generator.html"
        echo "📖 打开主页面: ${URL1}"
        echo "🎨 打开宣传图生成器: ${URL2}"
        ;;
    *)
        echo "❌ 无效选择"
        kill ${SERVER_PID}
        exit 1
        ;;
esac

# 打开浏览器
if [ "${MACHINE}" = "Mac" ]; then
    if [ "$choice" = "3" ]; then
        open ${URL1}
        open ${URL2}
    else
        open ${URL}
    fi
elif [ "${MACHINE}" = "Linux" ]; then
    if [ "$choice" = "3" ]; then
        xdg-open ${URL1} &
        xdg-open ${URL2} &
    else
        xdg-open ${URL} &
    fi
else
    echo "⚠️  请手动在浏览器中打开："
    if [ "$choice" = "3" ]; then
        echo "   ${URL1}"
        echo "   ${URL2}"
    else
        echo "   ${URL}"
    fi
fi

echo ""
echo "✨ 服务器运行中..."
echo "📍 主页面: http://localhost:${PORT}/index.html"
echo "🎨 宣传图生成器: http://localhost:${PORT}/promo_generator.html"
echo ""
echo "⚠️  按 Ctrl+C 停止服务器"
echo ""

# 等待用户中断
trap "echo ''; echo '🛑 停止服务器...'; kill ${SERVER_PID}; echo '✅ 已停止'; exit 0" INT

wait ${SERVER_PID}
