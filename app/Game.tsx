"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    webgazer: any;
  }
}

export default function Component() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [webGazerReady, setWebGazerReady] = useState(false);

  useEffect(() => {
    const checkWebGazer = () => {
      if (window.webgazer) {
        setWebGazerReady(true);
      } else {
        setTimeout(checkWebGazer, 100);
      }
    };

    checkWebGazer();
  }, []);

  useEffect(() => {
    if (!gameStarted || !webGazerReady) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let fallingObjects: FallingObject[] = [];
    let lastSpawnTime = 0;
    const spawnInterval = 2000; // Spawn a new object every 2 seconds

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Load sounds
    const laserSound = new Audio("/laser.mp3");
    const explosionSound = new Audio("/explosion.mp3");
    const hurtSound = new Audio("/hurt.mp3");

    // Load images
    const characterImg = document.createElement("img");
    characterImg.src = "/Shaktimaan.png";
    const asteroidImg = document.createElement("img");
    asteroidImg.src = "/asteroid.png";
    asteroidImg.width = 200;
    asteroidImg.height = 200;

    class FallingObject {
      x: number;
      y: number;
      size: number;
      speed: number;
      destroyed: boolean;
      destroyAnimation: number;
      rotation: number;
      rotationSpeed: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = 0;
        this.size = 40;
        this.speed = 1 + Math.random() * 2;
        this.destroyed = false;
        this.destroyAnimation = 0;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
      }

      update() {
        if (this.destroyed) {
          this.destroyAnimation += 1;
          return;
        }
        this.y += this.speed;
        this.rotation += this.rotationSpeed;
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        if (this.destroyed) {
          ctx.globalAlpha = 1 - this.destroyAnimation / 30;
          ctx.drawImage(
            asteroidImg,
            -this.size / 2,
            -this.size / 2,
            this.size + this.destroyAnimation,
            this.size + this.destroyAnimation
          );
        } else {
          ctx.drawImage(
            asteroidImg,
            -this.size / 2,
            -this.size / 2,
            this.size,
            this.size
          );
        }

        ctx.restore();
      }
    }

    function drawCharacter(ctx: CanvasRenderingContext2D) {
      const characterSize = 80;
      ctx.drawImage(
        characterImg,
        canvas.width / 2 - characterSize / 2,
        canvas.height - characterSize - 20,
        characterSize,
        characterSize
      );
    }

    function drawLaser(
      ctx: CanvasRenderingContext2D,
      startX: number,
      startY: number,
      endX: number,
      endY: number
    ) {
      ctx.strokeStyle = "#FF0000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    function drawScore(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = "white";
      ctx.font = "24px Arial";
      ctx.fillText(`Score: ${score}`, 20, canvas.height - 20);
    }

    function drawLives(ctx: CanvasRenderingContext2D) {
      ctx.fillStyle = "red";
      for (let i = 0; i < lives; i++) {
        ctx.beginPath();
        ctx.arc(
          canvas.width - 30 - i * 30,
          canvas.height - 30,
          10,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }

    function gameLoop(timestamp: number) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawCharacter(ctx);
      drawScore(ctx);
      drawLives(ctx);

      if (timestamp - lastSpawnTime > spawnInterval) {
        fallingObjects.push(new FallingObject());
        lastSpawnTime = timestamp;
      }

      fallingObjects = fallingObjects.filter((obj) => {
        obj.update();
        obj.draw(ctx);

        if (obj.y > canvas.height && !obj.destroyed) {
          setLives((prevLives) => {
            if (prevLives > 1) {
              hurtSound
                .play()
                .catch((e) => console.error("Error playing hurt sound:", e));
              return prevLives - 1;
            } else {
              // Game over logic here
              setGameStarted(false);
              return 0;
            }
          });
          return false;
        }

        if (obj.destroyed && obj.destroyAnimation > 30) {
          return false;
        }

        return true;
      });

      window.webgazer.getCurrentPrediction().then((prediction: any) => {
        if (prediction) {
          const { x, y } = prediction;
          ctx.fillStyle = "yellow";
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, Math.PI * 2);
          ctx.fill();

          drawLaser(ctx, canvas.width / 2, canvas.height - 60, x, y);

          fallingObjects.forEach((obj) => {
            if (!obj.destroyed) {
              const dx = obj.x - x;
              const dy = obj.y - y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < obj.size) {
                obj.destroyed = true;
                laserSound
                  .play()
                  .catch((e) => console.error("Error playing laser sound:", e));
                setScore((prevScore) => prevScore + 20);
                setTimeout(
                  () =>
                    explosionSound
                      .play()
                      .catch((e) =>
                        console.error("Error playing explosion sound:", e)
                      ),
                  100
                );
              }
            }
          });
        }
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    }

    window.webgazer
      .setGazeListener(() => {})
      .begin()
      .then(() => {
        console.log("WebGazer is ready");
        animationFrameId = requestAnimationFrame(gameLoop);
      });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.webgazer.end();
    };
  }, [gameStarted, webGazerReady, score, lives]);

  const startGame = () => {
    if (webGazerReady) {
      setGameStarted(true);
      setScore(0);
      setLives(3);
    } else {
      alert(
        "WebGazer or assets are not ready yet. Please wait a moment and try again."
      );
    }
  };

  return (
    <div className="relative w-full h-screen">
      <Image
        src="/space.jpg"
        alt="Deep space background with stars and galaxies"
        layout="fill"
        objectFit="cover"
        quality={100}
        priority
        className="bg-gray-600 bg-opacity-75"
      />
      {!gameStarted ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-600 bg-opacity-75 text-white">
          <Image
            src="/Shaktimaan.png"
            alt="Shaktimaan"
            className="rounded-full mb-4"
            width={200}
            height={200}
            quality={100}
          />
          <h1 className="text-4xl font-bold mb-4">Shaktimaan Laser Shooter</h1>
          <p className="mb-8 text-center">
            Destroy falling asteroids by shooting laser beams with your eyes.<br />
            Protect Shaktimaan from getting hit by the asteroids.
          </p>
          <Button onClick={startGame} disabled={!webGazerReady}>
            {!webGazerReady ? "Loading WebGazer..." : "Start Game"}
          </Button>
        </div>
      ) : (
        <>
          <canvas ref={canvasRef} className="w-full h-full relative z-10" />
          <video
            ref={videoRef}
            className="absolute top-4 left-4 w-32 h-24 object-cover z-20"
            autoPlay
            playsInline
          />
        </>
      )}
    </div>
  );
}
