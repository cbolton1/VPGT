import AIModel

import pandas as pd
import numpy as np
import os
import glob
from datetime import datetime
from sklearn.preprocessing import PowerTransformer
import tensorflow as tf
from tensorflow.keras import layers
from tensorflow.keras.layers.experimental import preprocessing
from keras.models import Sequential
from keras.layers import Dense
from numpy.random import randn


###__Control Variables__##

features = ['BaseDateTime', 'LAT', 'LON', 'SOG', 'COG', 'Heading']
#size of the latent space
latent_dim = 10
#names=[MMSI,BaseDateTime,LAT,LON,SOG,COG,Heading,VesselName,IMO,CallSign,VesselType,Status,Length,Width,Draft,Cargo,TranscieverClass])

####__FUNCTIONS__####

#Function to save a model with a unique name in the current directory
def save_model(trained_model):
  #Get a list of the files in the directory
  files = os.listdir('./models/')
  #Create a variable to count the saved models
  savecount = 0
  #Count the number of saved models
  while(files.__contains__('model_%d.h5' % (savecount))):
    savecount = savecount + 1
  #Save the model with a unique name
  trained_model.save('./models/model_%d.h5' % (savecount))

#Function to create latent points
def generate_latent_points(latent_dim, samples_count):
  x_input = randn(latent_dim * samples_count)
  x_input = x_input.reshape(samples_count, latent_dim)
  return x_input

#Function using the generator and latent points to create fake samples
def generate_fake_samples(generator, latent_dim, samples_count):
  x_input = generate_latent_points(latent_dim, samples_count)
  X = generator.predict(x_input)
  #create truth value
  y = np.zeros((samples_count, 1))
  return X, y

#Function to take real samples from the datasource
def generate_real_samples(n):
  X = paths[n]
  x_arr = X.to_numpy()
  #generate truth values
  y = np.ones((n, 1))
  return x_arr, y

#Function to create the generator model
def define_generator(latent_dim, n_outputs=6):
  model = Sequential()
  model.add(Dense(15, activation='relu', kernel_initializer='he_uniform', input_dim=latent_dim))
  model.add(Dense(30, activation='relu'))
  # model.add(Dense(n_outputs, activation='sigmoid'))
  model.add(Dense(n_outputs, activation='linear'))
  return model

#Function to create the discriminator model
def define_discriminator(shape):
  model = Sequential()
  model.add(Dense(25, activation='relu', kernel_initializer='he_uniform', input_shape=shape))
  model.add(Dense(50, activation='relu'))
  model.add(Dense(1, activation='sigmoid'))
	#compile model
  model.compile(loss='binary_crossentropy', optimizer='adam', metrics=['accuracy'])
  return model

#Make the GAN using both the generator and the discriminator
def define_gan(generator, discriminator):
	#Make the discriminator not trainable
	discriminator.trainable = False
	#Create model and add the generator and the discriminator then compile
	model = Sequential()
	model.add(generator)
	model.add(discriminator)
	model.compile(loss='binary_crossentropy', optimizer='adam')
	return model


#Function to train the generator and discrimintor GAN
def train(g_model, d_model, gan_model, latent_dim, n_epochs=1000, n_batch=128):
  
  #determine half the size of one batch, for updating the discriminator
  half_batch = int(n_batch / 2)

  d_history = []
  g_history = []
  
  #Loop through epochs
  for epoch in range(n_epochs):
    #prepare real and fake samples
    x_real, y_real = generate_real_samples(half_batch)
    x_fake, y_fake = generate_fake_samples(g_model, latent_dim, half_batch)
    #update discriminator
    d_loss_real, d_real_acc = d_model.train_on_batch(x_real, y_real)
    d_loss_fake, d_fake_acc = d_model.train_on_batch(x_fake, y_fake)
    d_loss = 0.5 * np.add(d_loss_real, d_loss_fake)
    
    #prepare points in latent space as input for the generator
    x_gan = generate_latent_points(latent_dim, n_batch)
    
    #create inverted labels for the fake samples
    y_gan = np.ones((n_batch, 1))
    
    #update the generator with the discriminators error
    g_loss_fake = gan_model.train_on_batch(x_gan, y_gan)

    print('>%d, d1=%.3f, d2=%.3f d=%.3f g=%.3f' % (epoch+1, d_loss_real, d_loss_fake, d_loss,  g_loss_fake))
    #print(x_fake)
    #print(y_fake)
    d_history.append(d_loss)
    g_history.append(g_loss_fake)

  #plot_history(d_history, g_history)

    # if i==999:
    #   np.savetxt("new_X.csv", X, delimiter=",")
    
    # evaluate the model every n_eval epochs
    # if (i+1) % n_eval == 0:
    #   summarize_performance(i, g_model, d_model, latent_dim)
  
  #Save the model
  save_model(g_model)

def readData():
  #Get a list of the files in the directory and read them all into a list of lists
  files = glob.glob('./training/*.json')
  pathsList = []
  for file in files:
    path = pd.read_json(file)
    path.drop('MMSI', axis= 1, inplace= True)

    singlePath = path.values.squeeze().tolist()
    pathsList.append(singlePath)
  return pathsList


###__Process__###

#Read data and drop useless columns

paths = readData()
pathsCount = len(paths)
pathLength = len(paths[0])
pathFeatureCount = len(paths[0][0])
inputShape = (pathLength, pathFeatureCount)
#create the discriminator
discriminator = define_discriminator(inputShape)
#create the generator
generator = define_generator(latent_dim)
#create the gan
gan_model = define_gan(generator, discriminator)
#train model
train(generator, discriminator, gan_model, latent_dim)

class GANModel(AIModel.AIModel):
    def __init__(self):
        super().__init__()
        size = 0

    def Train(self):
        super().Train()
        print('Training GAN')

    def Generate(self):
        super().Generate()
        print('Generating with GAN')