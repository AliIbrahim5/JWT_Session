import { connectDB } from "./config/db";
import { User, Todo } from "@prisma/client";
import { authorize, protect } from "../src/middleware/auth";
import express, { Request, Response } from "express";
import { prisma } from "../src/config/db";
import * as argon2 from "argon2";
import * as jwt from "jsonwebtoken";
const app = express();

connectDB();

app.use(express.json());


app.post("/register", async (req: Request, res: Response) => {
  
    const newUser = req.body as User;

    const hashedPassword = await argon2.hash(newUser.password);
    newUser.password = hashedPassword;
    await prisma.user.create({
      data: newUser,
    });
    return res.status(201).json({
      message: "Welcome to the website ! , user added !",
    }); 
});
app.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body as User;

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    return res.status(400).json({
      message: "Wrong username or password",
    });
  }

  const isValidPassword = await argon2.verify(user.password, password);

  if (!isValidPassword) {
    return res.status(400).json({
      message: "Wrong username or password",
    });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECERT as string
  );

  return res.status(200).json({
    message: `Welcome back ! ${username}`,
    token,
  });
});
app.get("/users", protect, async (req: Request, res: Response) => {
    const users = await prisma.user.findMany();
    return res.status(200).json(users);
});

app.get("/admin",protect,authorize("ADMIN"),async (req: Request, res: Response) => {
    return res.status(200).json({ message: "Hey admin with id" + res.locals.user.id });
  }
);

app.get("/user",protect,authorize("USER", "ADMIN"),async (req: Request, res: Response) => {
      return res.status(200).json({ message: "Hey user" });
    }
  )

  // Todo Get All Todo from user
  .get("/", protect, async (req: Request, res: Response) => {
    const user = res.locals.user ;

    const todoList = await prisma.todo.findMany({
      where: { user_id: user.id },
    });

    return res.status(200).json(todoList);
  });

app.post("/", protect, async (req: Request, res: Response) => {
  const { title } = req.body as Todo;
  const user = res.locals.user ;

  await prisma.todo.create({
    data: {
      title,
      user_id: user.id,
    },
  });

  return res.status(201).json({
    message: "New todo created for user : " + user.id,
  });
});

app.put("/:todoid", protect, async (req: Request, res: Response) => {
  try {
    const user = res.locals.user ;
    const updatedTodo = req.body as Todo;
    const { todoid } = req.params ;

    const isUpdated = await prisma.todo.updateMany({
      where: {
        id: todoid,
        user_id: user.id,
      },
      data: updatedTodo,
    });

    if (isUpdated.count == 0) {
      return res.status(400).json({
        message: "Invalid todo id",
      });
    }

    return res.status(200).json({
      message: "Todo updated !",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Server error !",
    });
  }
});

app.delete("/:todoid", protect,async (req: Request, res: Response) => {
  const user = res.locals.user ;
  const { todoid } = req.params ;

  const deleteCount = await prisma.todo.deleteMany({
    where: {
      id: todoid,
      user_id: user.id,
    },
  });

  if (deleteCount.count == 0) {
    return res.status(400).json({
      message: 'Invalid todo id',
    });
  }

  return res.status(200).json({
    message: 'Todo deleted !',
  });
} );
app.listen(3000, () => {
  console.log("Server is running port 3000");
});
