from flask import Blueprint, jsonify, request, session
from models.user import User, db
import json
import os

user_bp = Blueprint('user', __name__)

# Função para carregar dados dos funcionários do arquivo JSON
def load_employees_data():
    DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "database", "planilha_data.json")
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get("employees", [])
        except (json.JSONDecodeError, IOError):
            pass
    
    # Dados padrão se o arquivo não existir
    return [
        {"name": "Anderson", "password": "123"},
        {"name": "Vitoria", "password": "123"},
        {"name": "Jemima", "password": "123"},
        {"name": "Maiany", "password": "123"},
        {"name": "Fernanda", "password": "123"},
        {"name": "Nadia", "password": "123"},
        {"name": "Giovana", "password": "123"}
    ]

# Função para salvar dados dos funcionários no arquivo JSON
def save_employees_data(employees):
    DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "database", "planilha_data.json")
    try:
        # Carregar dados existentes
        existing_data = {}
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
        
        # Atualizar apenas a lista de funcionários
        existing_data["employees"] = employees
        
        # Salvar de volta
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Erro ao salvar dados dos funcionários: {e}")
        return False

@user_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get("username", "").strip()
    password = data.get("password", "")
    
    if not username or not password:
        return jsonify({"success": False, "message": "Usuário e senha são obrigatórios"}), 400
    
    # Verificar se é admin
    if username == "admin" and password == "admin123":
        session['user'] = 'admin'
        session['is_admin'] = True
        return jsonify({
            "success": True, 
            "user": "Administrador", 
            "is_admin": True
        })
    
    # Verificar funcionários
    employees = load_employees_data()
    employee = next((emp for emp in employees if emp["name"].lower() == username.lower()), None)
    
    if employee and employee["password"] == password:
        session['user'] = employee["name"]
        session['is_admin'] = False
        return jsonify({
            "success": True, 
            "user": employee["name"], 
            "is_admin": False
        })
    
    return jsonify({"success": False, "message": "Usuário ou senha incorretos"}), 401

@user_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logout realizado com sucesso"})

@user_bp.route('/check-session', methods=['GET'])
def check_session():
    if 'user' in session:
        return jsonify({
            "logged_in": True,
            "user": session['user'],
            "is_admin": session.get('is_admin', False)
        })
    return jsonify({"logged_in": False})

@user_bp.route('/change-employee-password', methods=['POST'])
def change_employee_password():
    # Verificar se o usuário é admin
    if not session.get('is_admin'):
        return jsonify({"success": False, "message": "Acesso negado"}), 403
    
    data = request.json
    employee_name = data.get("employee_name")
    new_password = data.get("new_password")
    
    if not employee_name or not new_password:
        return jsonify({"success": False, "message": "Nome do funcionário e nova senha são obrigatórios"}), 400
    
    employees = load_employees_data()
    employee = next((emp for emp in employees if emp["name"] == employee_name), None)
    
    if not employee:
        return jsonify({"success": False, "message": "Funcionário não encontrado"}), 404
    
    # Atualizar senha
    employee["password"] = new_password
    
    if save_employees_data(employees):
        return jsonify({"success": True, "message": "Senha alterada com sucesso"})
    else:
        return jsonify({"success": False, "message": "Erro ao salvar alterações"}), 500

@user_bp.route('/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@user_bp.route('/users', methods=['POST'])
def create_user():
    data = request.json
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({"message": "Dados incompletos"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"message": "Nome de usuário já existe"}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email já existe"}), 409

    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

@user_bp.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())

@user_bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.json
    user.username = data.get('username', user.username)
    user.email = data.get('email', user.email)
    db.session.commit()
    return jsonify(user.to_dict())

@user_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return '', 204


@user_bp.route("/users/<int:user_id>/change_password", methods=["PUT"])
def change_password(user_id):
    user = User.query.get_or_404(user_id)
    data = request.json
    new_password = data.get("new_password")

    if not new_password:
        return jsonify({"message": "Nova senha não fornecida"}), 400

    user.set_password(new_password)
    db.session.commit()
    return jsonify({"message": "Senha alterada com sucesso"}), 200


