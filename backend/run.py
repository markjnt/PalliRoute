from app import create_app, db

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=9000, host='0.0.0.0') 