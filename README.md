
# Instructions for Setting Up and Running the Time Clock Server

This guide provides detailed steps for setting up and running the Time Clock Server application. Follow these instructions to ensure a smooth installation and execution process.

---

## Features

- User authentication and token-based authorization.
- Admin-only access for editing and fetching all user work times.
- Endpoints for setting and fetching work start and end times.
- Current time fetching from Germany using the WorldTimeAPI.
- Token blacklisting for secure user logout.
- Integrated Swagger documentation for API endpoints.
- Includes api.testing.js for automated API testing.

---

## Prerequisites

- Ensure you have the following installed:
  - **Node.js** (v14 or higher)
  - **npm** (Node Package Manager)

---


2. **Install Dependencies**
   Run the following command in your terminal:
   ```bash
   npm install
   ```

3. **Create Necessary Files**
   - `users.json`: Add user data in the following format:
     ```json
     [
       { "username": "user1@mail.com", "password": "password1" },
       { "username": "user2@mail.com", "password": "password2" },
       { "username": "admin@mail.com", "password": "adminpass" }
     ]
     ```
   - `workTimes.json`: Create an empty JSON file to store work times.


---

## Running the Server

1. **Start the Server in Development Mode**
   ```bash
   node start
   ```

---

## Running the Tester

1. **test the Server in Development Mode**
   ```bash
   node test
   ```

---

## Accessing Swagger Documentation

- Once the server is running, open your browser and navigate to:
  ```
  http://localhost:3000/api-docs
  ```

---

## Error Handling

The server provides the following error responses:
- **401**: Unauthorized (e.g., missing or invalid token).
- **403**: Forbidden (e.g., access restricted to admins).
- **404**: Resource not found.
- **500**: Server errors (e.g., failed external API requests).

---

## Notes

- Endpoints are annotated with Swagger comments for generating documentation.
- Retries are implemented for fetching time data from the WorldTimeAPI.
- Swagger UI provides an interactive interface for testing API endpoints.

---

## Images Section
- All swagger commands
<img width="1440" alt="Screenshot 2024-12-31 at 9 30 28" src="https://github.com/user-attachments/assets/e4edf705-02e8-4a51-8c08-6418dbae2d77" />
- Show the time in germany.
<img width="1440" alt="Screenshot 2024-12-31 at 9 31 29" src="https://github.com/user-attachments/assets/6878da3e-5409-48f2-9858-339b1ed20947" />
- Login to the user.
<img width="1440" alt="Screenshot 2024-12-31 at 9 32 25" src="https://github.com/user-attachments/assets/db6c4236-9689-4c62-af86-45e8234278c9" />
- Set the start work time to the current time in germany.
<img width="1440" alt="Screenshot 2024-12-31 at 9 36 20" src="https://github.com/user-attachments/assets/5f8210cc-bec5-45dd-86d1-42629b102768" />
- Set the end work time to the current time in germany.
<img width="1440" alt="Screenshot 2024-12-31 at 9 36 45" src="https://github.com/user-attachments/assets/ff1dbc41-727c-4f89-91b1-767948bd1975" />
- Only the admin can see all the work hours of all the users
<img width="1440" alt="Screenshot 2024-12-31 at 9 38 30" src="https://github.com/user-attachments/assets/1ced19bf-2206-4993-97e1-9ce37070d275" />
- Only the admin can set the work time of every user by sending the user mail startTime and endTime of his choosing 
<img width="1440" alt="Screenshot 2024-12-31 at 9 40 05" src="https://github.com/user-attachments/assets/ff7c7ce5-c29d-4a35-b689-b5a619804b01" />


---


Developed with ❤️ using Node.js and Express.
