<script>
import { onMount } from 'svelte';
import FpsCtrl from './FpsCtrl'
import {zones, facts} from './data'
	import {fade, fly} from 'svelte/transition'
	var scrollY = 0
	let canvas
	let feet = true, toggleUnit = ()=>{feet = !feet}
	let touchStartY, touchStartScroll
	$: b = 510 - (scrollY  * 0.74695121951)
	let r, g
	let scrollMod = 1
	$: scrollMod = scrollY >= 0 ? scrollY < 650 ? 1 : scrollY < 1000 ? 4 : scrollY < 3300 ? 10 : scrollY <  13000 ? 20 : 40 : 1
	$: r = g = 230 - (scrollY * 0.74695121951)
	let handleScroll = (e) => {
		
		scrollY += Math.trunc(e.deltaY/30*scrollMod)
		scrollY = scrollY >= 0 ? scrollY <= 25000 ? scrollY : 25000 : 0
	}
	let handleTouchStart = (e) =>{
		touchStartY = e.touches[0].screenY
		touchStartScroll = scrollY
	}
	let handleTouchMove = (e) =>{
		let scrollAmount = touchStartScroll + (touchStartY-e.touches[0].screenY)/7*scrollMod
		scrollY =  scrollAmount >= 0 ? scrollAmount <= 25000 ? scrollAmount : 25000 : 0
	} 
	onMount(()=>{
		
		canvas.width = window.innerWidth
		canvas.height = window.innerHeight
		let randomPositions = [...Array(Math.trunc(0.00009*canvas.width*canvas.height)).keys()]. map((i)=> [Math.random()*canvas.width, Math.random()*canvas.height, 2 + Math.random()*2])
		const fps = new FpsCtrl(30, move)
		fps.start();
		
		function move(){
			if(canvas.width!= window.innerWidth || canvas.height!= window.innerHeight){
				canvas.width = window.innerWidth
				canvas.height = window.innerHeight
				randomPositions = [...Array(Math.trunc(0.00009*canvas.width*canvas.height)).keys()]. map((i)=> [Math.random()*canvas.width, Math.random()*canvas.height, 2 + Math.random()*2])
			}
			
			const ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		ctx.fillStyle = 'rgba(255,255,255,.7)'
		ctx.filter = 'blur(3px)'
		for(let i=0; i<randomPositions.length; i++){
			randomPositions[i][0] +=  (Math.random() < 0.5 ? -.05 : .05);
			randomPositions[i][1] += (Math.random() < 0.5 ? -.05 : .05);
			ctx.beginPath();
			ctx.arc(randomPositions[i][0], randomPositions[i][1], randomPositions[i][2], 0, Math.PI*2)
			ctx.fill()
		}
		}
	})

</script>
<svelte:window on:wheel={handleScroll} on:touchmove={handleTouchMove} on:touchstart={handleTouchStart} />
<main style='background-color: rgb({r}, {g}, {b})'>
	{#if scrollY<190}
	<h1  style='top: {scrollY <  190 ? scrollY > 50 ? 0 - scrollY + 50 : 0 : -100}px; opacity: {scrollY > 120 ? 1 - (scrollY - 120)/20 : 1}'>dive</h1>

	{/if}
	{#if feet}
	<h3 in:fade  style='margin-top:{scrollY <  190 ? scrollY > 50 ? 150 - scrollY + 50 : 150 : 10}px;'>{Math.trunc(scrollY)} <span class='unit' on:click={toggleUnit}>ft.</span></h3>
	{/if}
	{#if !feet}
	<h3 in:fade  style='margin-top:{scrollY <  190 ? scrollY > 50 ? 150 - scrollY + 50 : 150 : 10}px;' >{Math.trunc(scrollY * 0.3048)} <span class='unit' on:click={toggleUnit}>m.</span></h3>
	{/if}
	{#each zones as zone}
	{#if zone.depth <= scrollY && zone.fade>=scrollY}
	<header transition:fade>
		<h2>{zone.title}</h2>
		<p>{zone.text}</p>
	</header>
	{/if}
	{/each}
	{#each facts as fact}
	{#if fact.depth <= scrollY && fact.fade>=scrollY}
	<header transition:fade>
		<p>{fact.text}</p>
	</header>
	{/if}
	{/each}
</main>
<canvas bind:this={canvas}/>

<style>
	.unit:hover {
		cursor:pointer;
	}
	main {
		z-index: 2;
		text-align: center;
		height: 100%;
		width: 100%;
		position: fixed;
		margin: 0 auto;
	}
	canvas {
		pointer-events: none;
		position: absolute;
		width: 100%;
		height: 100%;
		z-index: 100;
	}
	
	h3{
		background-color: rgba(255,255,255,.5);
		border-radius: .25rem;
		padding: .1rem;
		width: fit-content;
		margin: auto;
		
	}
	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
		position: absolute;
		margin-left: auto;
		margin-right: auto;
		left: 0;
		right: 0;
		text-align: center;
	}
	header{
		background-color: rgba(255,255,255,.5);
		border-radius: .25rem;
		padding: .1rem;
		width: fit-content;
		margin: auto;
		margin-top: 20px;
	}
	
</style>